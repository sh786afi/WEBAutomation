var { LOCATOR_SIGNUP } = require("../lib/constant");
var doSignup = function() {
  this.signUp = async (user_name, email_id, password, isDob) => {
    await LOCATOR_SIGNUP.name.sendKeys(user_name);
    await LOCATOR_SIGNUP.email.sendKeys(email_id);
    await LOCATOR_SIGNUP.pass.sendKeys(password);
    if (isDob) {
      LOCATOR_SIGNUP.dob.click();
      LOCATOR_SIGNUP.date.click();
    }
    await LOCATOR_SIGNUP.signup_button.click();
  };

  this.splashScreen = async () => {
    browser.sleep(2000);
    await LOCATOR_SIGNUP.splash_next_1.click();
    await LOCATOR_SIGNUP.splash_next_2.click();
    await LOCATOR_SIGNUP.splash_getstarted.click();
    browser.sleep(7000);
    await LOCATOR_SIGNUP.submit_location.isDisplayed().then(isVisible => {
      if (isVisible) {
        LOCATOR_SIGNUP.submit_location.click();
      }
    });
  };
};
module.exports = new doSignup();
