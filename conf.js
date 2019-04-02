// conf.js
var HtmlReporter = require("protractor-beautiful-reporter");
exports.config = {
  framework: "jasmine",
  seleniumAddress: "http://localhost:4444/wd/hub",
  params: {
    url: "https://alpha.woovly.com",
    fb_email: "karanxelp@yahoo.com",
    fb_password: "admin123",
    excel_path: "",
    ran: Math.floor(100000 + Math.random() * 900000),
    ran1: Math.floor(100000 + Math.random() * 900000),
    uploadImage: "../testData/images/haunted/",
    userEmailid: "tester@gmail.com",
    userEmailPass: "123456"
  },
  capabilities: {
    browserName: "chrome",
    shardTestFiles: true,
    maxInstances: 1,
    chromeOptions: {
      args: ["--headless", "--disable-gpu", "--window-size=1800,1200"]
    },
    chromeOptions: {
      args: ["no-sandbox"]
    }
  },
  specs: [
    "./spec/specSignup.js",
    "./spec/specAddStory.js",
    "./spec/specInviteFriend.js",
    "./spec/specAddOthersBucket.js"
  ],

  // your config here ...

  onPrepare: function() {
    // Add a screenshot reporter and store screenshots to `/woovly/screenshots`:
    jasmine.getEnv().addReporter(
      new HtmlReporter({
        baseDirectory: "woovly/screenshots"
      }).getJasmine2Reporter()
    );
  }
};
