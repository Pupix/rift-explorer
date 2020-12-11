import React, { useEffect, useState } from "react";
import Swagger from "swagger-ui-react";

import electron from "electron";

import { platform } from "os";

import Loading from "./Loading";

import appstyles from "./stylesheets/sass/app.module.sass";
import Logo from "./images/logo.png";
import discord from "./images/discord.svg";
import github from "./images/github.svg";

const ipc = electron.ipcRenderer;

const IS_WIN = platform() === "win32";

const App = (): React.ReactElement => {
  const [credentials, setCredentials]: any = useState("");
  const [givePrompt, setGivePrompt]: any = useState(false);
  const [promptAnswer, setPromptAnswer]: any = useState(null);
  const [status, setStatus]: any = useState("Starting");

  useEffect(() => {
    if (promptAnswer === false) {
      console.log("closing window");
      ipc.send("program_close", "");
    } else if (promptAnswer === true) {
      ipc.send("PROMPTRESTART", "");
    }
  }, [promptAnswer]);

  useEffect(() => {
    ipc.send("FEREADY", "");

    ipc.on("BEPRELOAD", (event, data) => {
      console.warn(`DATA PRELOAD: >${data}<`);
      if (data !== "" && data !== {}) {
        setCredentials(data);
      } else {
        setStatus("Attempting to connect to the League Client");
      }
      ipc.removeAllListeners("BEPRELOAD");
    });

    ipc.on("LCUCONNECT", (event, data) => {
      console.log("Connected to league client!");
      setStatus("Connected to league client!");
      setGivePrompt(true);
      setCredentials(data);
    });

    ipc.on("LCUDISCONNECT", (event, data) => {
      console.log("League client disconnected attempting to reconnect");
      setStatus("League client disconnected attempting to reconnect");
      setGivePrompt(false);
      setPromptAnswer(null);
      setCredentials("");
    });
  }, []);

  return (
    <>
      <div
        className={IS_WIN ? appstyles.titlebar_win : appstyles.titlebar_macos}
        draggable={false}
      >
        <div className={appstyles.column}>
          {IS_WIN ? (
            <div className={appstyles.buttons_win}>
              <div className={appstyles.spacer} />
              <div
                className={appstyles.buttons_min}
                onClick={() => {
                  ipc.send("process_min", "");
                }}
              />
              <div
                className={appstyles.buttons_minmax}
                onClick={() => {
                  ipc.send("process_minmax", "");
                }}
              />
              <div
                className={appstyles.buttons_close}
                onClick={() => {
                  ipc.send("program_close", "");
                }}
              />
            </div>
          ) : (
            <div className={appstyles.buttons_mac}>
              <div
                className={appstyles.buttons_close}
                onClick={() => {
                  ipc.send("program_close", "");
                }}
              />
              <div
                className={appstyles.buttons_minmax}
                onClick={() => {
                  ipc.send("process_fullscreen", "");
                }}
              />
              <div
                className={appstyles.buttons_min}
                onClick={() => {
                  ipc.send("process_min", "");
                }}
              />
            </div>
          )}
        </div>
        <div className={appstyles.deadzone} />
        <div className={appstyles.column}>
          <div className={appstyles.logo}>
            <img src={Logo} alt="" /> Rift Explorer 7
          </div>
        </div>
      </div>

      {credentials !== "" ? (
        <div className={appstyles.swaggercontainer}>
          <div className={appstyles.riftinfo}>
            <img src={Logo} className={appstyles.riftlogo} alt="" />
            <div className={appstyles.riftname}>
              Rift Explorer
              <div className={appstyles.riftslogan}>
                Always up to date documentation for the LCU API
              </div>
            </div>
            <div>
              <img src={discord} alt="" className={appstyles.rifticons} />
              <img src={github} alt="" className={appstyles.rifticons} />
            </div>
          </div>

          <Swagger
            docExpansion="none"
            defaultModelExpandDepth={1}
            url={`https://${credentials.username}:${credentials.password}@${credentials.address}:${credentials.port}/swagger/v2/swagger.json`}
          />
        </div>
      ) : (
        <Loading
          message={status}
          prompt={givePrompt}
          promptSetter={setPromptAnswer}
        />
      )}
    </>
  );
};

export default App;
