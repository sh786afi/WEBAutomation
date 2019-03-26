var data = require("../conf");
var doSignup = require("../pom/signup");
var doLogin = require("../pom/login");
var ran = Math.floor(100000 + Math.random() * 900000);
describe("Sign Up", function() {
  beforeEach(async () => {
    browser.ignoreSynchronization = true;
    await doLogin.openBrowser(data.config.params.url);
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000;
  });

  it("TestTestCase 1:-Sign Up with all valid data", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp(
      "shafi",
      "shafi" + ran + "@mailinator.com",
      "123456",
      true
    );
    browser.sleep(3000);
    await doSignup.splashScreen();
    browser.sleep(2000);
    await doLogin.offerClose();
    browser.sleep(2000);
    await doLogin.Logout();
    browser.sleep(2000);
    console.log("TestCase 1 PASSED");
  });

  it("TestCase 2:- Sign Up with all valid data expect Invalid email id  ", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp(
      "shafi",
      "shafi" + ran + "mailinator.com",
      "123456",
      true
    );
    browser.sleep(2000);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter valid email address"
    );
    browser.sleep(2000);
    console.log("TestCase 2 PASSED");
  });
  it("TestCase 3:- Sign Up with all valid data and empty Full name ", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp(
      "",
      "shafi" + ran + "1" + "@mailinator.com",
      "123456",
      true
    );
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter user name"
    );
    browser.sleep(2000);
    console.log("TestCase 3 PASSED");
  });
  it("TestCase 4:- Sign Up with all valid data and empty email id", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp("shafi", "", "123456", true);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter email address"
    );
    browser.sleep(2000);
    console.log("TestCase 4 PASSED");
  });
  it("TestCase 5:-Sign Up with all valid data and empty password ", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp("shafi", "shafi" + ran + "1@auto.com", "", true);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please enter password"
    );
    browser.sleep(2000);
    console.log("TestCase 5 PASSED");
  });
  it("TestCase 6:- Sign Up with all valid data and  empty DOB", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp(
      "shafi",
      "shafi" + ran + "1@auto.com",
      "123456",
      false
    );
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Please provide valid date of birth"
    );
    browser.sleep(2000);
    console.log("TestCase 6 PASSED");
  });

  it("TestCase 7:- Sign Up with all valid data and already existing email id", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doSignup.signUp("shafi", "para27rsh@gmail.com", "123456", false);
    await expect(element(by.className("toast-message")).getText()).toEqual(
      "Email address already registered"
    );
    browser.sleep(2000);
    console.log("TestCase 7 PASSED");
  });
  it("TestCase 8:-Sign Up with Facebook", async () => {
    await doLogin.loginSignupLink();
    browser.sleep(2000);
    await doLogin.fbLogin(
      data.config.params.fb_email,
      data.config.params.fb_password
    );
    browser.sleep(2000);
    await doLogin.offerClose();
    browser.sleep(2000);
    await doLogin.Logout();
    browser.sleep(2000);
    console.log("TestCase 8 PASSED");
  });
});
