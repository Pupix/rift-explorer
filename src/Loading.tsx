import React from "react";

import Prompt from "./Prompt";

import Logo from "./images/logo.png";

import styles from "./stylesheets/sass/loading.module.sass";

interface LoadingInterface {
  message: string;
  prompt: boolean;
  promptSetter: any;
}

const Loading = ({
  message,
  prompt,
  promptSetter,
}: LoadingInterface): React.ReactElement => {
  return (
    <div className={styles.loading}>
      <img
        className={styles.loading_logo}
        src={Logo}
        alt="Rift Explorer logo"
      />
      <br />
      <br />
      {prompt ? (
        <Prompt answer={promptSetter} />
      ) : (
        <div className={styles.loading_text}>{message}</div>
      )}
    </div>
  );
};

export default Loading;
