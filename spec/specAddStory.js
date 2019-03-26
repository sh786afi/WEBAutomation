var login = require("../pom/login");
var add_story = require("../pom/addStory");
var data = require("../conf.js");

describe("Woovly Create Story Module", function() {
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

  it("Case 1:- Create Story & Publish With Existing Bucketlist", async function() {
    await add_story.Get_New_Story1("test233433");
    browser.sleep(2000);
    expect(await browser.getTitle()).toEqual(
      "Automated Story id" +
        " " +
        data.config.params.ran +
        " - Bucket List | Woovly"
    );
    console.log(
      "Story Title Verified Successfully..." +
        "Automated Story id" +
        " " +
        data.config.params.ran
    );
    browser.sleep(2000);
    await login.Logout();
    browser.sleep(2000);
  });

  it("Case 2:- Create Story & Save With Existing Bucketlist", async function() {
    await add_story.Get_New_Story2("test233433");
    browser.sleep(3000);
    expect(await browser.getTitle()).toEqual(
      "Automated Story id" +
        " " +
        data.config.params.ran1 +
        " - Bucket List | Woovly"
    );
    console.log(
      "Story Title Verified Successfully..." +
        "Automated Story id" +
        " " +
        data.config.params.ran1
    );
    browser.sleep(2000);
    await login.Logout();
    browser.sleep(2000);
  });
});
