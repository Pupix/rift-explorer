import React from "react";

import styles from "./stylesheets/sass/Prompt.module.sass";

interface PromptPropsInterface {
  answer: any;
}

const Prompt = ({ answer }: PromptPropsInterface): React.ReactElement => {
  return (
    <div className={styles.prompt}>
      <div className={styles.prompt_text}>
        Rift explorer needs to log you out in order to work.
        <br />
        Please press ok to continue both on the League client and below.
      </div>
      <div className={styles.prompt_buttons}>
        <button
          type="button"
          className={styles.prompt_button}
          onClick={() => {
            console.error("setting false");
            answer(false);
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.prompt_button}
          onClick={() => {
            answer(true);
          }}
        >
          Ok
        </button>
      </div>
    </div>
  );
};

export default Prompt;
