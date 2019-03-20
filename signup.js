var SignupPO = function() {
  var name = $('[ng-focus="signUpNameFocus"]');
  var email = $('[ng-blur="checkEmail($event)"]');
  var pass = $('[ng-model="signUpPass"]');
  var dob = $('[ng-focus="signUpDobFocus"]');
  var date = element(
    by.xpath('//*[@id="signupDobDiv"]/div/table/tbody/tr[5]/td[4]/a')
  );
  var signup_button = $('[ng-click="signup($event)"]');
  var splash_next_1 = $('[ng-click="nextHelpWebAdd()"]');
  var splash_next_2 = $('[ng-click="nextHelpWebFeeds()"]');
  var splash_getstarted = $('[ng-click="landOnFeeds()"]');
  var submit_location = $('[ng-click="confirmLocation($event,1)"]');

  this.signUp = async (user_name, email_id, password, d) => {
    await name.sendKeys(user_name);
    await email.sendKeys(email_id);
    await pass.sendKeys(password);
    if (d == 1) {
      dob.click();
      date.click();
    }

    await signup_button.click();
  };

  this.splashScreen = async () => {
    browser.sleep(3000);
    await splash_next_1.click();
    await splash_next_2.click();
    await splash_getstarted.click();
    browser.sleep(7000);
    await submit_location.isDisplayed().then(isVisible => {
      if (isVisible) {
        submit_location.click();
      } else {
        // element is not visible
      }
    });
  };
};
module.exports = new SignupPO();
