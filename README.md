![Rift Explorer logo](assets/logo.png?raw=true)

----
![Discord](https://discord.com/api/guilds/392092221932830722/widget.png)
![GitHub package.json version](https://img.shields.io/github/package-json/v/pupix/rift-explorer)
![GitHub all releases](https://img.shields.io/github/downloads/pupix/rift-explorer/total)
![GitHub repo size](https://img.shields.io/github/repo-size/pupix/rift-explorer)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/pupix/rift-explorer)
![Lines of code](https://img.shields.io/tokei/lines/github/pupix/rift-explorer)

# Always up to date documentation for the League Client API.
Rift Explorer helps aid development of LCU applications by generating documentation of the LCU
API.

## What is the LCU?
For more information as to what the LCU is please refer to [this link](https://developer.riotgames.com/docs/lol#league-client-api).

## Table of contents:
1. [Getting Started](#getting-started)
    - [Requirements](#requirements)
    - [Prebuilt Binaries](#prebuilt)
    - [Building](#building)
        - [Prerequisites](#prerequisites)
        - [Run from source](#run-from-source)
        - [Build from source](#build-from-source)
1. [Bugs and Issues](#bugs-and-issues)
1. [Contributing](#contributing)
1. [FAQ](#faq)
1. [License](#license)

## Getting Started

## Requirements
   - Windows 7 or above (64-bit)
   - macOS sierra or above (64-bit)
   - Linux is partially supported(64-bit). - if you would like to help please open an issue regarding it

*Note: 32-bit is unsupported.*

## Prebuilt

The latest prebuilt binaries for Windows and macOS can be found below

<a href="https://github.com/Pupix/rift-explorer/releases/download/latest/rift-explorer-v6.3.0-darwin-x64.zip">
    <img alt="macos" src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/404px-Apple_logo_black.svg.png" width="50" />
</a>
&nbsp;
<a href="">
    <img alt="windows" src="https://cdn4.iconfinder.com/data/icons/social-media-logos-6/512/70-windows-512.png" width="50" />
</a>

## Building
### Prerequisites
 - [Yarn 1.x.x](https://classic.yarnpkg.com/lang/en/)

### Run from source

#### 1. Clone from repo
```SHELL
git clone https://github.com/Pupix/rift-explorer.git
```

#### 2. Install dependencies
```SHELL
yarn install
```

#### 3. Start League of Legends
<br>

#### 4. Start Rift Explorer
```shell
yarn dev
```

<br/>

### Build from source

#### 1. Clone from repo
```SHELL
git clone https://github.com/Pupix/rift-explorer.git
```

#### 2. Install dependencies
```SHELL
yarn install
```

#### 3. Build
```shell
yarn build
```

## Bugs and Issues

For any bugs or issues please use the [issue template](.github/ISSUE_TEMPLATE/bug_report.md)

## Contributing
Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
1. Create your Feature Branch (git checkout -b feature/AmazingFeature)
1. Commit your Changes (git commit -m 'Add some AmazingFeature')
1. Push to the Branch (git push origin feature/AmazingFeature)
1. Open a Pull Request

## FAQ
**Q: Why is a 32-bit version of Rift Explorer missing?**

A: We have never supported 32-bit versions of Rift Explorer and will never provide support nor downloads for 32-bit versions, 
However it can be built from source but as said previously no support will be given if an issue arises.
Any issues relating to 32-bit versions of Rift Explorer will simply be closed.

## License
Distributed under the MIT License. See [LICENSE.md](LICENSE.md) for more information.
