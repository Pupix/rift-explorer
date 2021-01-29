import React, { Component } from "react";
import SwaggerUI from "swagger-ui";

interface PropTypes {
  // eslint-disable-next-line @typescript-eslint/ban-types
  spec: object | string;
  auth: string;
}

// eslint-disable-next-line react/prefer-stateless-function
export default class Swagger extends Component<PropTypes> {
  constructor(props: PropTypes) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    console.log("triggered swagger refresh");
    const { auth, spec } = this.props;
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
        deepLinking: true,
        request: {
          curlOptions: ["--insecure", `-H "Authorization: ${auth}"`],
        },
      });
    } catch (e) {
      console.log("not ready to swagify");
    }
  }

  componentDidUpdate() {
    console.log("triggered swagger refresh");
    const { auth, spec } = this.props;
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
        deepLinking: true,
        request: {
          curlOptions: ["--insecure", `-H "Authorization: ${auth}"`],
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
