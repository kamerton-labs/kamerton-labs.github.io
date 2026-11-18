# Descriptions in git

Kamerton can take system descriptions from a git repository. The repository becomes the place where a system is changed and reviewed; Kamerton follows one branch and applies what is merged there. Nobody runs a command after a merge.

New in 0.3.0. Tried on the k3s test cluster with a repository of one system: adding a service, a broken file, a name clash and a deleted file.

## Turn it on

```sh
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values \
  --set git.url=https://github.com/your-team/observability.git \
  --set git.path=systems
```

| Value | Default | Meaning |
| --- | --- | --- |
| `git.url` | empty | https URL of the repository, without credentials. Empty: off. |
| `git.branch` | `main` | The branch to follow. |
| `git.path` | empty | A folder in the repository. Empty reads the whole repository. |
| `git.secretName` | `kamerton-git` | Secret with an access token for a private repository. |
| `git.interval` | `1m` | How often Kamerton looks at the branch. |

For a private repository create a read-only token and put it in a Secret:

```sh
kubectl -n kamerton create secret generic kamerton-git --from-literal=token='<token>'
```

GitHub, GitLab and Gitea take such a token as the password of HTTP basic auth, and that is how Kamerton sends it. SSH keys are not supported yet.

## What goes in the repository

Description files, one system per file, anywhere under the folder:

```text
observability/
  systems/
    shop.yaml
    billing.yaml
```

Kamerton reads `.yaml` and `.yml` files whose `kind` is `SystemDescription`. Other YAML in the same folder, such as Helm values or CI files, is ignored. The format is the one in [Describe a system](./describe-system); `bin/kamerton validate -f shop.yaml` checks a file before you commit it.

## What happens after a merge

Within the interval Kamerton sees the new commit, validates every file, generates the rules and routing and applies them, exactly as it does for a system saved in the UI.

| In the repository | In the cluster |
| --- | --- |
| A new file | The system is created. |
| A changed file | The system is replaced; its rules follow. |
| A file with an error | The system stays as it was. The error is shown on the Systems screen with the file and the field. |
| A deleted file | The system and its rules are deleted. |
| The repository cannot be read | Nothing changes and nothing is deleted. |
| A mistyped folder | Nothing changes and nothing is deleted. |

## Systems from git are read-only in the UI

A system that came from git shows its file and commit, and its Save button is off. Saving or deleting it through the API answers `409` with the code `from_git`. This is deliberate: two places to change one system drift apart.

That includes the things the UI normally writes into a description: a chat or a mail recipient added on the Channels screen, a quieter threshold applied from the rule card. For a system from git make those changes in its file.

Systems made in the UI or with `kubectl` are left alone and stay editable. If a file names a system that already exists and did not come from this repository, Kamerton does not take it over: the file is reported as a conflict until one of the two is renamed or the existing system is deleted.

## Where to look

- The Systems screen shows the repository, the applied commit, when it was last checked, and every file that could not be applied.
- Each system from git carries the annotations `kamerton.dev/git-repo`, `kamerton.dev/git-path` and `kamerton.dev/git-commit`.
- `GET /api/v1/systems` returns the state of the last read in `git`.

The commit on a system is the one that last changed its file, not the tip of the branch.

## Limits

- Kamerton reads; it does not write. A change made in the UI is not turned into a commit or a pull request yet.
- One repository, one branch, one folder per installation.
- http(s) only, with an optional token. No SSH keys, no commit signature checks.
- Only in a cluster with the controller on.
- The state of the last read is kept in memory: after a restart it is empty until the first read, a few seconds later.
