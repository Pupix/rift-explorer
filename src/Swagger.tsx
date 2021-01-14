import React, { Component } from "react";
import SwaggerUI from "swagger-ui";

interface PropTypes {
  // eslint-disable-next-line @typescript-eslint/ban-types
  spec: object | string;
}

// eslint-disable-next-line react/prefer-stateless-function
export default class Swagger extends Component<PropTypes> {
  constructor(props: PropTypes) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    console.log("triggered swagger refresh");
    const { spec } = this.props;
    try {
      SwaggerUI({
        dom_id: "#swagger",
        spec,
        operationsSorter: "alpha",
        tagsSorter: "alpha",
        docExpansion: "none",
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        filter: "",
        request: {
          curlOptions: ["--insecure"],
        },
      });
    } catch (e) {
      console.log("not ready to swagify");
    }
  }

  componentDidUpdate() {
    console.log("triggered swagger refresh");
    const { spec } = this.props;
    try {
      SwaggerUI({
        dom_id: "#swagger",
        spec,
        operationsSorter: "alpha",
        tagsSorter: "alpha",
        docExpansion: "none",
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        filter: "",
        request: {
          curlOptions: ["--insecure"],
        },
      });
    } catch (e) {
      console.log("not ready to swagify");
    }
  }

  render() {
    return <div id="swagger" />;
  }
}
