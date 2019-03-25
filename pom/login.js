var { LOCATOR_LOGIN } = require("../lib/constant");
var doLogin = function() {
  this.openBrowser = async url => {
    await browser.get(url);
    await browser.driver
      .manage()
      .window()
      .maximize();
  };

  this.loginSignupLink = async () => {
    await LOCATOR_LOGIN.login_signup_link.click();
  };
  this.offerClose = async () => {
    await LOCATOR_LOGIN.offer.isDisplayed().then(async isVisible => {
      if (isVisible) {
        await LOCATOR_LOGIN.offer.click();
      }
    });
  };

  this.fbLogin = async (fb_emailid, fb_password) => {
    browser.sleep(5000);
    await LOCATOR_LOGIN.fb_button.click();
    browser.sleep(3000);
    //Sign in with to popup
    await browser.getAllWindowHandles().then(async handles => {
      var popupHandle = handles[1];
      await browser.switchTo().window(popupHandle);
      browser.sleep(3000);
      //perform operations
      await LOCATOR_LOGIN.fb_email.sendKeys(fb_emailid);
      await LOCATOR_LOGIN.fb_pass.sendKeys(fb_password);
      await LOCATOR_LOGIN.fb_login.click();
      browser.sleep(5000);
      //Back to Previous Window
      await browser.driver.switchTo().window(handles[0]);
      browser.sleep(3000);
    });
  };

  this.Logout = async () => {
    browser.sleep(5000);
    await LOCATOR_LOGIN.profile_pic.click();
    await LOCATOR_LOGIN.logout.click();
  };
};
module.exports = new doLogin();
