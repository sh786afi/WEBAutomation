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

  it("CASE 1:-Sign Up with all valid data", async () => {
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
    console.log("Case 1 PASSED");
  });

  //   it("CASE 2:- Sign Up with all valid data expect Invalid email id  ", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp(
  //       "shafi",
  //       "shafi" + ran + "mailinator.com",
  //       "123456",
  //       1
  //     );
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Please enter valid email address"
  //     );
  //     console.log("Case 2 PASSED");
  //   });
  //   it("CASE 3:- Sign Up with all valid data and empty Full name ", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp(
  //       "",
  //       "shafi" + ran + "1" + "@mailinator.com",
  //       "123456",
  //       1
  //     );
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Please enter user name"
  //     );
  //     console.log("Case 3 PASSED");
  //   });
  //   it("CASE 4:- Sign Up with all valid data and empty email id", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp("shafi", "", "123456", 1);
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Please enter email address"
  //     );
  //     console.log("Case 4 PASSED");
  //   });
  //   it("CASE 5:-Sign Up with all valid data and empty password ", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp("shafi", "shafi" + ran + "1@auto.com", "", 1);
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Please enter password"
  //     );
  //     console.log("Case 5 PASSED");
  //   });
  //   it("CASE 6:- Sign Up with all valid data and  empty DOB", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp("shafi", "shafi" + ran + "1@auto.com", "123456", 0);
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Please provide valid date of birth"
  //     );
  //     console.log("Case 6 PASSED");
  //   });

  //   it("CASE 7:- Sign Up with all valid data and already existing email id", async () => {
  //     await LoginPO.signupSinginLink();
  //     await SignupPO.signUp("shafi", "para27rsh@gmail.com", "123456", 0);
  //     await expect(element(by.className("toast-message")).getText()).toEqual(
  //       "Email address already registered"
  //     );
  //     console.log("Case 7 PASSED");
  //   });

  //   it("CASE 8:-Sign Up with Google", async () => {
  //     await LoginPO.signupSinginLink();
  //     await LoginPO.googleLogin(
  //       data.config.params.google_email,
  //       data.config.params.google_password
  //     );
  //     await LoginPO.offerClose();
  //     await LoginPO.Logout();
  //     console.log("Case 8 PASSED");
  //   });
  //   it("CASE 9:-Sign Up with Facebook", function() {
  //     LoginPO.signupSinginLink();
  //     LoginPO.fbLogin(
  //       data.config.params.fb_email,
  //       data.config.params.fb_password
  //     );
  //     LoginPO.offerClose();
  //     LoginPO.Logout();
  //   });
  //   console.log("Case 9 PASSED");
});
