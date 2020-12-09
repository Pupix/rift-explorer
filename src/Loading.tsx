import React from "react";

import Logo from "./images/logo.png";

import "./css/loading.css";

interface LoadingInterface {
  message: string;
}

const Loading = ({ message }: LoadingInterface) => {
  return (
    <div className="re-loading">
      <img className="re-loading__logo" src={Logo} alt="Rift Explorer logo" />
      <br />
      <br />
      <div className="re-loading__text">{message}</div>
    </div>
  );
};

export default Loading;
