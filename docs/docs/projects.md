# Projects

Kamerton starts with a project: a name and the place where its system descriptions live. Until one is open the UI shows only the first screen, without the sidebar. It has two ways in, the way an editor does.

## New project

A name, and a place for it.

- **On your machine** (`kamerton serve` without a cluster) the place is a folder, `~/kamerton/<name>` unless you type another. Kamerton writes the project file `kamerton.yaml`, a README, a `.gitignore` and an empty `systems` folder there, and opens it. A folder that already holds a project is refused; open it instead. "Create a git repository" runs `git init` in the folder and makes the first commit.
- **In a cluster** there is no folder to choose: the systems are `SystemDescription` resources in Kamerton's namespace and the name is kept in the ConfigMap `kamerton-project`. A repository can be connected right away ("Connect git right away" opens the project page after creating) or at any time later. A project taken from a repository keeps its name in the cluster as well, so disconnecting the repository later does not end the project.

## Clone from git

The repository's address, its branch and a token. Kamerton reads the repository first, then offers what fits: open the project that is there, or start one in it, pushed back with the first commit. Starting one needs a token with write access. "More" holds the folder inside the repository (empty: its root) and, in a cluster, the push mode. See [Descriptions in git](./git).

- On your machine the repository is cloned into a folder, `~/kamerton/<repository>` unless you type another; the folder must be empty. The token is used for the clone and not kept: the folder is an ordinary working copy. The project page lists what is not committed and not pushed, and has Pull, Commit & Push and Check; Check asks the repository for new commits without changing the folder, so the page can say how many came. They run your own git, with its access to the repository (a credential helper or an SSH key) and your name; Commit & Push commits only the project's folder, and Pull only follows on, leaving a branch that went apart for you to merge. Kamerton does not commit until `git config user.email` is set, so that git does not put an address made up from your host name into the history.
- In a cluster nothing is written to a disk: Kamerton follows the repository from there.

## Open a project

On your machine the first screen also lists the projects opened before and takes any folder with a project file, or a folder of description files from before project files existed. On start Kamerton opens the project opened last, unless it was closed by hand. "Close project" on the project page goes back to the first screen; the folder stays as it is.

## Rename a project

"Rename" next to the name on the project page. On your machine it changes `metadata.name` in `kamerton.yaml` and nothing else in the file, comments included; in a cluster it changes the kept name. With a repository connected the name is the one in the repository's project file: change it there, like any other file.

`--description` still opens a project at start: a project folder, or description files and folders as before.

The list of recent projects is kept in `kamerton/projects.json` under the user's configuration folder (`~/Library/Application Support` on macOS, `~/.config` on Linux).
