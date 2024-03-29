import * as Sentry from "@sentry/react";

import axios from "axios";
import { ipcRenderer as ipc } from "electron";
import { Agent } from "https";

import { platform } from "os";
import React, { useEffect, useState } from "react";
import discord from "./images/discord.svg";
import github from "./images/github.svg";
import Logo from "./images/logo.png";
import Loading from "./Loading";

import appstyles from "./stylesheets/sass/app.module.sass";

import Swagger from "./Swagger";

const reAgent = new Agent({
  rejectUnauthorized: false,
});

/**
 * Simple check to see if the platform is windows if not then assume it is macOS since that is the
 * only other supported platform.
 */
const IS_WIN = platform() === "win32";

const App = (): React.ReactElement => {
  const [swaggerJson, setSwaggerJson]: any = useState("");
  const [givePrompt, setGivePrompt]: any = useState(false);
  const [promptAnswer, setPromptAnswer]: any = useState(null);
  const [status, setStatus]: any = useState("Starting");
  const [credentials, setCredentials]: any = useState();
  const [retry, setRetry]: any = useState(0);

  useEffect(() => {
    Sentry.init({
      dsn:
        "https://8819124a931949c285f21102befaf7c3@o513342.ingest.sentry.io/5615032",
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.fetch = (inf, req) => {
      if (!credentials) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { url, method } = req;
      // eslint-disable-next-line consistent-return
      return axios
        .request({
          method: method || "get",
          url,
          httpsAgent: reAgent,
          withCredentials: true,
          responseType: "text",
          transformResponse: (res) => res,
          headers: {
            Authorization: `Basic ${btoa(
              `${credentials.username}:${credentials.password}`
            )}`,
          },
        })
        .then((res) => {
          console.log(`typeof res: ${typeof res}`);
          return new Response(res.data ? res.data : "", {
            headers: res.headers,
            status: res.status ? res.status : 200,
            statusText: res.statusText ? res.statusText : "k",
          });
        })
        .catch((error) => {
          console.error(error);
          console.error(`Credentials: ${JSON.stringify(credentials)}`);
          throw new Error(error);
        });
    };
  }, [credentials]);

  useEffect(() => {
    ipc.on("credentials_pass", (event, creds) => {
      console.log(`credentials_pass: ${JSON.stringify(creds)}`);
      setCredentials(creds);
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "f") {
        throw new Error("FrontEnd force error");
      }
    });
  }, []);

  useEffect(() => {
    console.log(`Credentials are`);
    console.log(credentials);
  }, [credentials]);

  /**
   * Check if prompt ever changes if it does then that means the prompt was answered and
   * do the appropriate action
   */
  useEffect(() => {
    if (promptAnswer === false) {
      console.log("closing window");
      ipc.send("PROMPTHELP", "");
    } else if (promptAnswer === true) {
      console.log("sent prompt restart");
      ipc.send("PROMPTRESTART", "");
    }
  }, [promptAnswer]);

  /**
   * Things to be done on initial load like notifying the back that the front
   * has loaded and is ready to receive data
   */
  useEffect(() => {
    /**
     * Let the back know the front is ready
     */
    ipc.send("FEREADY", "");

    /**
     * Set a listener if the back requires the user to interact for permission
     * to end the users session.
     */
    ipc.on("BELCUREQUESTGETRESTARTLCU", () => {
      setGivePrompt(true);
    });

    /**
     * Receive any data that the back may have before the front was ready.
     */
    ipc.on("BEPRELOAD", (event, data) => {
      console.warn(`DATA PRELOAD: >${data}<`);
      if (data !== "" && data !== {}) {
        setSwaggerJson(data);
      } else {
        setStatus("Attempting to connect to the League Client");
      }
      /**
       * Not really needed anymore so we remove it.
       */
      ipc.removeAllListeners("BEPRELOAD");
    });

    /**
     * Set a listener for when the LCU ever connects the front can ask for
     * permission to end the users session and set the state which is the swagger
     * json.
     */
    ipc.on("LCUCONNECT", (event, data) => {
      console.log("Connected to league client!");
      setStatus("Connected to league client!");
      setGivePrompt(true);
      setSwaggerJson(data);
    });

    /**
     * If the LCU disconnects just change the variables back.
     */
    ipc.on("LCUDISCONNECT", () => {
      console.log("League client disconnected; attempting to reconnect");
      setStatus("League client disconnected; attempting to reconnect");
      setGivePrompt(false);
      setPromptAnswer(null);
      setSwaggerJson("");
    });
  }, []);

  const onRetry = () => {
    setRetry(retry + 1);
    ipc.send("FEREADY", "");
  };

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
          {IS_WIN && (
            <div className={appstyles.logo}>
              <img src={Logo} alt="" /> Rift Explorer 7
            </div>
          )}
        </div>
      </div>

      {swaggerJson !== "" ? (
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
          {credentials && (
            <Swagger
              spec={swaggerJson}
              auth={`Basic ${btoa(
                `${credentials.username}:${credentials.password}`
              )}`}
            />
          )}

          {!credentials && (
            <div className={appstyles.err}>
              <div>
                AN ERROR HAS OCCURRED <br />
              </div>
              {/* eslint-disable-next-line react/button-has-type */}
              <button className={appstyles.retry} onClick={onRetry}>
                Retry #{retry}
              </button>
            </div>
          )}
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
