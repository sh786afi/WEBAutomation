// conf.js
var HtmlReporter = require("protractor-beautiful-reporter");
exports.config = {
  framework: "jasmine",
  seleniumAddress: "http://localhost:4444/wd/hub",
  params: {
    url: "https://alpha.woovly.com",
    fb_email: "shivam.parashar@xelpmoc.in",
    fb_password: "para1993",
    excel_path: ""
  },
  specs: ["spec.js"],

  // your config here ...

  onPrepare: function() {
    // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
    jasmine.getEnv().addReporter(
      new HtmlReporter({
        baseDirectory: "woovly/screenshots"
      }).getJasmine2Reporter()
    );
  }
};
