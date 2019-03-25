var doLogin = require("../pom/login");
var add_story = require("../pom/addStory");
var data = require("../conf.js");

describe("Woovly Create Story Module", function() {
  beforeEach(async () => {
    browser.ignoreSynchronization = true;
    await doLogin.openBrowser(data.config.params.url);
    browser.sleep(3000);
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doLogin.fbLogin(
      data.config.params.fb_email,
      data.config.params.fb_password
    );
    browser.sleep(2000);
    await doLogin.offerClose();
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000;
  });

  // it("Case 1:- Create Story & Publish With Existing Bucketlist", async function() {
  //   await add_story.Get_New_Story1("test");
  //   browser.sleep(2000);
  //   expect(await browser.getTitle()).toEqual(
  //     "Automated Story id" +
  //       " " +
  //       data.config.params.ran +
  //       " - Bucket List | Woovly"
  //   );
  //   console.log(
  //     "Story Title Verified Successfully..." +
  //       "Automated Story id" +
  //       " " +
  //       data.config.params.ran
  //   );
  //   browser.sleep(2000);
  // });

  it("Case 2:- Create Story & Save With Existing Bucketlist", async function() {
    await add_story.Get_New_Story2("test");
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
  });
});
