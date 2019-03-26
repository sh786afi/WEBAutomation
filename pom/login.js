var { LOCATOR_LOGIN } = require("../lib/constant");
var doLogin = function() {
  async function loginButton() {
    await LOCATOR_LOGIN.login_button.click();
  }

  async function clickLogin() {
    await LOCATOR_LOGIN.click_login.click();
  }

  async function emailClick() {
    await LOCATOR_LOGIN.email.click();
  }

  async function emailSend(email_id) {
    await LOCATOR_LOGIN.email.sendKeys(email_id);
  }

  async function passwordClick() {
    await LOCATOR_LOGIN.password.click();
  }

  async function passwordSend(Pass) {
    await LOCATOR_LOGIN.password.sendKeys(Pass);
  }

  async function signIn() {
    await LOCATOR_LOGIN.sign_in.click();
  }

  async function closeApp() {
    await LOCATOR_LOGIN.close_app.isDisplayed().then(function(isVisible) {
      if (isVisible) {
        LOCATOR_LOGIN.close_app.click();
        console.log("App Closed Successfully...");
      } else {
        console.log("Element not Visible");
      }
    });
  }
  //For random number
  this.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  async function getWoovly(url) {
    await browser.get(url);
    await browser.driver
      .manage()
      .window()
      .maximize();
  }
  this.Get_Email_Login = async (url, email, pass) => {
    await getWoovly(url);
    browser.sleep(4000);
    await loginButton();
    browser.sleep(2000);
    await clickLogin();
    await emailClick();
    await emailSend(email);
    await passwordClick();
    await passwordSend(pass);
    await signIn();
    browser.sleep(6000);
    await closeApp();
    browser.sleep(2000);
  };
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
