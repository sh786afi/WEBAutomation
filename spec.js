var data = require("./conf");
var SignupPO = require("./signup");
var LoginPO = require("./login");
var ran = Math.floor(100000 + Math.random() * 900000);
describe("Sign Up", function() {
  beforeEach(async () => {
    browser.ignoreSynchronization = true;
    await LoginPO.openBrowser(data.config.params.url);
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000;
  });

  it("TestTestCase 1:-Sign Up with all valid data", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp(
      "shafi",
      "shafi" + ran + "@mailinator.com",
      "123456",
      1
    );
    await SignupPO.splashScreen();
    await LoginPO.offerClose();
    await LoginPO.Logout();
    console.log("TestCase 1 PASSED");
  });

  it("TestCase 2:- Sign Up with all valid data expect Invalid email id  ", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp(
      "shafi",
      "shafi" + ran + "mailinator.com",
      "123456",
      1
    );
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter valid email address"
    );
    console.log("TestCase 2 PASSED");
  });
  it("TestCase 3:- Sign Up with all valid data and empty Full name ", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp(
      "",
      "shafi" + ran + "1" + "@mailinator.com",
      "123456",
      1
    );
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter user name"
    );
    console.log("TestCase 3 PASSED");
  });
  it("TestCase 4:- Sign Up with all valid data and empty email id", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp("shafi", "", "123456", 1);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter email address"
    );
    console.log("TestCase 4 PASSED");
  });
  it("TestCase 5:-Sign Up with all valid data and empty password ", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp("shafi", "shafi" + ran + "1@auto.com", "", 1);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter password"
    );
    console.log("TestCase 5 PASSED");
  });
  it("TestCase 6:- Sign Up with all valid data and  empty DOB", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp("shafi", "shafi" + ran + "1@auto.com", "123456", 0);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please provide valid date of birth"
    );
    console.log("TestCase 6 PASSED");
  });

  it("TestCase 7:- Sign Up with all valid data and already existing email id", async () => {
    await LoginPO.signupSinginLink();
    await SignupPO.signUp("shafi", "para27rsh@gmail.com", "123456", 0);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Email address already registered"
    );
    console.log("TestCase 7 PASSED");
  });
  browser.sleep(5000);
  it("TestCase 8:-Sign Up with Facebook", async () => {
    await LoginPO.signupSinginLink();
    await LoginPO.fbLogin(
      data.config.params.fb_email,
      data.config.params.fb_password
    );
    await LoginPO.offerClose();
    await LoginPO.Logout();
  });
  console.log("TestCase 8 PASSED");
});
