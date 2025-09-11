import * as foo from "foo";
import * as bar from "bar/file1";
import * as myStar from "star-bar";
import * as packagedBrowser from "browser-field-package";
import * as packagedMain from "main-field-package";
import * as packagedIndex from "no-main-field-package";

console.log(
  "HELLO WORLD!",
  foo.message,
  bar.message,
  myStar.message,
  packagedBrowser.message,
  packagedMain.message,
  packagedIndex.message
);
