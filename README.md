![Rift Explorer logo](assets/logo.png?raw=true)

----

Always up to date documentation for the League of Legends client API.

### Post v8.14 requirements
Since League of Legends v8.14 RIOT hid some developer functionality behind a flag. To make Rift Explorer work with newer versions of the game you need to manually enable the *swagger endpoint* by hand.

To enable *swagger* you need to add the `enable_swagger: true` at the start of the `system.yaml` file before starting the LCU client.

![Swagger explainer](assets/swagger.png?raw=true)

The file can be found here based on your OS

- **Windows**

    `C:\Riot Games\League of Legends\RADS\projects\league_client\releases\<LATEST_VERSION>\deploy\system.yaml`

- **MacOS**

    `/Applications/League of Legends.app/Contents/LoL/RADS/projects/league_client/releases/<LATEST_VERSION>/deploy/system.yaml`

Some regions may have a different directory structure but the general gist is the same.

**This file will need to be updated everytime there's a new LCU version.**

### Prebuilt

Prebuilt binaries for Windows can be found [here](https://github.com/Pupix/rift-explorer/releases)

### Build from source

1. Clone repository
`git clone https://github.com/Pupix/rift-explorer.git`

2. Install dependencies
`yarn install` or `npm install`

3. Start League of Legends

4. Start Rift Explorer
`yarn start` or `npm run start`

### Screenshot

![Client screenshot](assets/screenshot.png?raw=true)
