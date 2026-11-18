# Descriptions in git

Kamerton can take system descriptions from a git repository. The repository becomes the place where a system is changed and reviewed; Kamerton follows one branch and applies what is merged there. Nobody runs a command after a merge.

New in 0.3.0. Tried on the k3s test cluster with a repository of one system: adding a service, a broken file, a name clash, a deleted file, and a change made in the UI that went to a branch, was merged and came back to the cluster.

## Connect a repository

Open "Project" in the sidebar; git is a block on that page. The form has two modes.

- **Open**: the repository already holds a project. Enter its address and press "Test": Kamerton reads the repository and says what it found, without storing anything. "Connect" then starts following it.
- **Create**: start a project. Kamerton writes the project file, a README and a `.gitignore` into the folder you name, `observability` by default, and leaves everything else in the repository alone. It works in an empty repository (leave the folder empty to use its root) and in one that already has code. With pull requests on, the new project arrives as a pull request. Creating needs a token with write access and push turned on.

| Field | Meaning |
| --- | --- |
| Repository | https address, without credentials. |
| Branch | The branch to follow; `main` by default. |
| Folder | The project's root in the repository. Empty: the repository itself. |
| Token | For a private repository, and for push. Kept in the Secret `kamerton-git`, never shown again. |
| Push | Off (read only), Pull request, or straight to the branch. |

"Edit" on the same page changes any of it later, and "Disconnect" stops following the repository. Disconnecting deletes nothing: the systems stay and become editable in the UI again.

GitHub, GitLab and Gitea take an access token as the password of HTTP basic auth, and that is how Kamerton sends it. SSH keys are not supported yet.

### From the installation's settings instead

A repository can also be fixed by the installation. It is then shown in the UI and cannot be changed there:

```sh
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values \
  --set git.url=https://github.com/your-team/observability.git \
  --set git.write=pullRequest
```

The values are `git.url`, `git.branch`, `git.path`, `git.secretName`, `git.interval`, `git.write`, `git.provider`, `git.apiURL`, `git.commitStatus` and `git.generatedPath`; the token goes into the Secret:

```sh
kubectl -n kamerton create secret generic kamerton-git --from-literal=token='<token>'
```

## The project

A repository connected to Kamerton is a project: the systems, and next to them what they generate. A small file at its root, `kamerton.yaml`, says where things are, so the repository describes itself. Moving a project to another cluster then needs its address and nothing else.

```text
observability/
  kamerton.yaml         the project file
  systems/              one system per file; subfolders are fine
    shop.yaml
    team-a/billing.yaml
  generated/            rules, dashboards and runbooks; written by Kamerton
  drafts/               not read
  README.md
  .gitignore
```

```yaml
apiVersion: kamerton.dev/v1alpha1
kind: Project
metadata:
  name: observability
spec:
  systems: systems        # default
  generated: generated    # default; "" keeps generated files out of the repository
  ignore:                 # folders and files Kamerton does not read
    - drafts
```

`generated` is to `systems` what a build output is to source code: produced from it, never edited by hand, safe to delete and make again. It is committed on purpose, like a lock file, so a review shows what a change of a description really does.

Kamerton reads `.yaml` and `.yml` files whose `kind` is `SystemDescription`. Other YAML in the same folders, such as Helm values or CI files, is ignored. The format is the one in [Describe a system](./describe-system); `kamerton validate -f systems/shop.yaml` checks a file before you commit it.

A mistyped field in the project file is an error: nothing is read and nothing changes until it is fixed. Without a project file the installation's settings lay the repository out, `git.path` being the folder of systems and `git.generatedPath` the folder of generated files.

### Starting from an empty repository

Create an empty repository, connect it with `git.write` set, and add the first system in the UI. Kamerton makes the first commit: the system, its generated files, the project file above, a README that explains the layout and a `.gitignore`. The first commit goes straight to the followed branch even in pull-request mode, because there is nothing to open a request into yet. We tried this against a new private repository on github.com.

Kamerton never writes secrets, incident history or addresses of your Prometheus to the repository. The `.gitignore` is there for people working by hand.

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

## Save, then push

Saving a system from git does not touch the repository or the cluster. The change is kept as a change to push, and the system's page says "Saved, not pushed". So do a new system and a removal.

"Project" in the sidebar lists the changes to push, each with what it does to the rules. Write a message above the list and press "Commit & Push": all of them go out in one commit.

| Push mode | What Push does |
| --- | --- |
| Pull request | A new branch `kamerton/<name>-<commit>` and, on GitHub and GitLab, a pull or merge request. The cluster changes after the merge. |
| Straight to the branch | A commit on the followed branch, applied within seconds. |
| Off | Nothing can be saved: systems from git are read-only in the UI. |

"Discard" forgets a saved change. Saving the repository's own content again leaves nothing to push. With login on, the person's name goes into the commit.

A system created in the UI is pushed as a new file `<systems>/<name>.yaml`; it appears in the UI once its file is on the followed branch. Until then it is listed under the changes to push and cannot be opened.

On a hosting service Kamerton does not know, the branch is pushed and you open the request by hand. For a self-hosted GitHub or GitLab set the provider in the installation's settings.

The same page lists the commits of the followed branch, newest first, with the systems each one touches and the applied one marked.

One thing stays refused in every mode: the changes Kamerton makes to a description by itself, such as a chat or a mail recipient added on the Channels screen. For a system from git put the receiver into its file.

## Systems that already exist

A system made in the UI or with `kubectl` before git was connected is left alone. It stays editable in the UI and saved to the cluster, whatever the repository holds.

To put such a system under git, use "Add to git" in its menu. Its description becomes a change to push: a new file. The system keeps working as it is; once the file is on the followed branch, the file takes the system over in place. Nothing is deleted and recreated, so its rules never go away. On our test the PrometheusRule of the moved system was the same object before and after.

Putting the file into the repository by hand does not do this. If a file names a system that already exists and did not come from this repository, Kamerton does not take it over: the file is reported as a conflict until one of the two is renamed, the existing system is deleted, or it is added with "Add to git".

Files may sit in subfolders of `git.path`, for example one folder per team; Kamerton reads the whole tree. One installation follows one repository, one branch and one folder.

## The rules next to the description

A description changes by a line; the rules it produces may change by dozens. With a `generated` folder in the project file (or `git.generatedPath` without one), every change Kamerton writes also carries what the description generates:

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
- Writing was tried against github.com (a private repository: pull request, merge, commit statuses, an empty repository) and against a plain git server. GitLab was tried only against a stand-in for its API.
- One repository, one branch, one folder per installation.
- http(s) only, with an optional token. No SSH keys, no commit signature checks.
- Only in a cluster with the controller on.
- The state of the last read is kept in memory: after a restart it is empty until the first read, a few seconds later.
