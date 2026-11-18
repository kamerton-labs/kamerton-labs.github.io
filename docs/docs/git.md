# Descriptions in git

Kamerton can take system descriptions from a git repository. The repository becomes the place where a system is changed and reviewed; Kamerton follows one branch and applies what is merged there. Nobody runs a command after a merge.

New in 0.3.0. Tried on the k3s test cluster with a repository of one system: adding a service, a broken file, a name clash, a deleted file, and a change made in the UI that went to a branch, was merged and came back to the cluster.

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
| `git.write` | empty | What "Save" in the UI does to a system from git: nothing, `pullRequest` or `commit`. |
| `git.provider`, `git.apiURL` | empty | The hosting service, for a self-hosted GitHub or GitLab. |
| `git.commitStatus` | `false` | Mark every read commit as applied or not. |
| `git.generatedPath` | empty | A folder for the generated rules, dashboards and runbooks. |

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

## Changing a system from git

There is one place where such a system changes: its file. How the UI takes part is the setting `git.write`.

| `git.write` | What "Save" does in the UI |
| --- | --- |
| empty (default) | Nothing. The system is read-only, with its file and commit shown. |
| `pullRequest` | The change is pushed to a new branch `kamerton/<system>-<commit>`. On GitHub and GitLab Kamerton also opens a pull or merge request and shows its address. The cluster changes after the merge. |
| `commit` | The change is committed straight to the followed branch and applied within seconds. |

Both writing modes need a token with write access in the Secret. The commit author is `Kamerton`; the file is edited as it is in the repository, so comments and the lines nobody touched stay as they were. Deleting the system in the UI removes its file the same way. A system created in the UI becomes a new file `<git.path>/<name>.yaml`: with writing on, the repository is where systems are made, and the new system appears in the UI once its file is on the followed branch.

On a hosting service Kamerton does not know, `pullRequest` still pushes the branch; open the request from it by hand. For a self-hosted GitHub or GitLab set `git.provider` (`github` or `gitlab`) and, if the API is not at the usual path, `git.apiURL`.

Without a writing mode, saving or deleting through the API answers `409` with the code `from_git`. With one it answers `202` and says where the change went.

One thing stays refused in every mode: the changes Kamerton makes to a description by itself, such as a chat or a mail recipient added on the Channels screen. For a system from git put the receiver into its file.

## Systems that already exist

A system made in the UI or with `kubectl` before git was connected is left alone. It stays editable in the UI and saved to the cluster, whatever the repository holds.

To put such a system under git, use "Move to git" in its menu. Kamerton writes its description to the repository as a new file. The system keeps working as it is; once the file is on the followed branch, the file takes the system over in place. Nothing is deleted and recreated, so its rules never go away. On our test the PrometheusRule of the moved system was the same object before and after.

Putting the file into the repository by hand does not do this. If a file names a system that already exists and did not come from this repository, Kamerton does not take it over: the file is reported as a conflict until one of the two is renamed, the existing system is deleted, or it is moved with "Move to git".

Files may sit in subfolders of `git.path`, for example one folder per team; Kamerton reads the whole tree. One installation follows one repository, one branch and one folder.

## The rules next to the description

A description changes by a line; the rules it produces may change by dozens. Set `git.generatedPath` to a folder, and every change Kamerton writes also carries what the description generates:

```text
observability/
  systems/
    shop.yaml                     the description, edited by people
  generated/
    shop/
      rules/shop.rules.yaml       written by Kamerton
      dashboards/
      runbooks/
```

The review then shows both: the line that changed and the rules it changes. On our test, raising one threshold from 2% to 3% was one line in the description and twelve in the rules.

The layout is that of `kamerton generate -o`, so a change made by hand can refresh the folder with the same command:

```sh
kamerton generate -f systems/shop.yaml -o generated/shop
```

## A check in CI

`kamerton diff` says in words what a change of a description does to the rules:

```sh
kamerton diff -f systems/shop.yaml --against old/shop.yaml
```

```text
System shop: 2 changed, 0 added, 0 removed (26 rules after).

Changed
- cart · KamertonErrorRateHigh: threshold 5% -> 2%; for 1m -> 3m
- cart · KamertonOperationErrorRateHigh: threshold 5% -> 2%; for 1m -> 3m
```

It needs no cluster. A GitHub Actions job that validates every description of a pull request and prints the difference from the target branch:

```yaml
name: observability
on:
  pull_request:
    paths: ['systems/**']
jobs:
  rules:
    runs-on: ubuntu-latest
    env:
      IMAGE: ghcr.io/kamerton-labs/kamerton:0.3.0
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: |
          kamerton() { docker run --rm -v "$PWD:/w" -w /w "$IMAGE" "$@"; }
          for f in systems/*.yaml; do
            kamerton validate -f "$f"
            git show "origin/${{ github.base_ref }}:$f" > .before.yaml 2>/dev/null || rm -f .before.yaml
            kamerton diff -f "$f" --against .before.yaml >> "$GITHUB_STEP_SUMMARY"
          done
```

The image has no shell, so it is run with `docker run`, not as the job's container. We ran these commands with the image on a laptop; the job itself has not run on GitHub.

## A mark on the commit

With `git.commitStatus: true` Kamerton marks every commit it reads on GitHub or GitLab, like a build system does: green with the number of systems applied, red with the file and the error. The token must be allowed to set commit statuses.

## Where to look

- The Systems screen shows the repository, the applied commit, when it was last checked, and every file that could not be applied.
- Each system from git carries the annotations `kamerton.dev/git-repo`, `kamerton.dev/git-path` and `kamerton.dev/git-commit`.
- `GET /api/v1/systems` returns the state of the last read in `git`.

The commit on a system is the one that last changed its file, not the tip of the branch.

## Limits

- Pull and merge requests and commit statuses work on GitHub and GitLab. Elsewhere Kamerton pushes the branch and you open the request.
- Writing was tried against a plain git server and a stand-in for the hosting API, not against github.com or gitlab.com.
- One repository, one branch, one folder per installation.
- http(s) only, with an optional token. No SSH keys, no commit signature checks.
- Only in a cluster with the controller on.
- The state of the last read is kept in memory: after a restart it is empty until the first read, a few seconds later.
