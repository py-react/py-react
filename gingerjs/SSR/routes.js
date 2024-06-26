const { Writable,Transform } = require("stream");
const path = require("path");
const ext = "js";

const React = require("react");
const ReactDOMServer = require("react-dom/server");


class LoggingTransformStream extends Transform {
  constructor(options) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    // Check if chunk is undefined
    if (typeof chunk === 'undefined') {
      console.error("Received undefined chunk");
      // Call the callback to signal that the chunk has been processed
      return callback();
    }

    // Pass the chunk through to the next stream in the pipeline
    this.push(chunk);
    // Call the callback to signal that the chunk has been processed
    callback();
  }

}

// Custom writable stream that logs data to the console
class LoggingWritableStream extends Writable {
  constructor(options) {
    super(options);
    this.data = [];
  }

  renderString() {
    return this.data.join("");
  }

  _write(chunk, encoding, callback) {
    this.data.push(chunk.toString());
    // Call the callback to signal that the chunk has been processed
    callback();
  }
}

class SSR {
  constructor(cwd) {
    this.cwd = cwd
  }
  async render(props) {
    return new Promise((resolve, reject) => {
      try {
        const App = require(path.resolve("./", "build", "app", "app.js"));
        const StaticRouter = require(path.resolve(
          "./",
          "build",
          "app",
          "StaticRouterWrapper.js"
        ));
        const { location } = props;
        const ReactElement = React.createElement(App.default, {
          children: null,
          location,
          ...props,
        });
        const StaticRouterWrapper = React.createElement(StaticRouter.default, {
          children: ReactElement,
          url: props.location.path,
        });
        const componentHTML =
          ReactDOMServer.renderToPipeableStream(StaticRouterWrapper);
        
        // Create an instance of the logging writable stream
        const loggingWritableStream = new LoggingWritableStream();
        const loggingTransformStream = new LoggingTransformStream();
        componentHTML.pipe(loggingTransformStream).pipe(loggingWritableStream);
        // After the stream has ended, the concatenated string can be accessed
        loggingWritableStream.on("finish", () => {
          resolve(loggingWritableStream.renderString())
        });
      } catch (error) {
        console.log(error,"error")
        reject(error);
      }
    })
  }

  async partialRender(props){
    return new Promise((resolve, reject) => {
      // const Component = require(path.resolve("./", "build", "app", "app.js"));
      const Component = require(path.resolve(this.cwd,"build","app",...props.location.path.split("/"),"index.js"));
      const StaticRouter = require(path.resolve(
        "./",
        "build",
        "app",
        "StaticRouterWrapper.js"
      ));
      const { location } = props;
      const ReactElement = React.createElement(Component.default, {
        children: null,
        location,
        ...props,
      });
      const StaticRouterWrapper = React.createElement(StaticRouter.default, {
        children: ReactElement,
        url: props.location.path,
      });
      const componentHTML =
          ReactDOMServer.renderToPipeableStream(ReactElement);
      
      // Create an instance of the logging writable stream
      const loggingWritableStream = new LoggingWritableStream();
      const loggingTransformStream = new LoggingTransformStream();
      componentHTML.pipe(loggingTransformStream).pipe(loggingWritableStream);
      // After the stream has ended, the concatenated string can be accessed
      loggingWritableStream.on("finish", () => {
        resolve(loggingWritableStream.renderString())
      });
    })
  }

  createElement(path, props) {
    const componentFile = require(path);
    const Component = componentFile.default; // Import the individual component
    const reactElem = React.createElement(Component, {
      ...props,
    });
    return reactElem;
  }
}


module.exports = SSR
