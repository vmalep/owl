import {} from "./components/component";
import { mount, Component } from "./components/index";
import { qweb } from "./qweb/qweb";
import { useState } from "./hooks";
import { xml } from "./tags";

const renderToString = qweb.renderToString;

export { mount, renderToString, Component, xml, useState };
