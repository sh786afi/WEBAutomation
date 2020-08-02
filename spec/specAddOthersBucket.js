var login = require("../pom/login");
var bucket = require("../pom/addOthersBucket");
var data = require("../conf");
var signUp = require("../pom/signup");
var dirfolder = ["Pubg", "Games", "Nature", "Superheroes", "UK"];
var fullPath = "../testData/images/";
var randir = signUp.getRandomInt(0, 4);
var { uploadImage, datetime } = require("../lib/common.js");
var { LOCATOR_UPLOAD } = require("../lib/constant");

browser.waitForAngularEnabled(true);
describe("Woovly Invite Friend Module ", function() {
  originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000000;
  beforeEach(async () => {
    await login.Get_Email_Login(
      data.config.params.url,
      data.config.params.userEmailid,
      data.config.params.userEmailPass
    );
    browser.sleep(5000);
  });
  it("Positive Case1 :- Add Others Bucket List and accomplish", async function() {
    await bucket.addBucket();
    browser.sleep(2000);
    await uploadImage(
      fullPath + dirfolder[randir],
      3,
      LOCATOR_UPLOAD.uploadInputImage
    );
    browser.sleep(25000);
    bucket.expDesc(
      "Been There Done That ,New BLI Test  Autoamtion ID " +
        data.config.params.ran +
        " " +
        datetime
    );
    bucket.mmYyyy("02", "200" + signUp.getRandomInt(1, 9));
    browser.sleep(5000);
    bucket.feedBackLocTag("Bangalore", "Atul Singh");
    bucket.finish();
  });
});
