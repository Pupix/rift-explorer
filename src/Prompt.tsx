import React from "react";

import styles from "./stylesheets/sass/Prompt.module.sass";

interface PromptPropsInterface {
  answer: any;
}

const Prompt = ({ answer }: PromptPropsInterface): React.ReactElement => {
  return (
    <div className={styles.prompt}>
      <div className={styles.prompt_text}>
        Rift explorer needs to log you out in order to get more accurate
        documentation.
        <br />
        Please press Restart. If you wish to continue please press Restart below
        and then exit on the league client.
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
          Don&apos;t Restart
          <div className={styles.prompt_tip}>Will generate less endpoints</div>
        </button>
        <button
          type="button"
          className={styles.prompt_button}
          onClick={() => {
            answer(true);
          }}
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default Prompt;
