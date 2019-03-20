var LoginPO = function() {
  var signup_singin_link = element(
    by.xpath('//*[@id="contHt"]/div[1]/div[2]/div[9]/div[1]/div[2]')
  );
  var fb_button = element(by.id("fbBtnGlobal"));
  var fb_email = element(by.id("email"));
  var fb_pass = element(by.id("pass"));
  var fb_login = element(by.id("loginbutton"));
  var offer = element(by.id("newCloseIcon"));

  browser.sleep(3000);
  var profile_pic = element(by.css('[ng-show="loggedInUser"]'));
  var logout = element(by.xpath('//*[@id="usersetting1"]/div/a[3]/div'));

  this.openBrowser = async url => {
    await browser.get(url);
    await browser.driver
      .manage()
      .window()
      .maximize();
  };

  this.signupSinginLink = async () => {
    await signup_singin_link.click();
  };
  this.offerClose = async () => {
    await offer.isDisplayed().then(async isVisible => {
      if (isVisible) {
        await offer.click();
      } else {
        // element is not visible
      }
    });
  };

  this.fbLogin = async (fb_emailid, fb_password) => {
    browser.sleep(5000);
    await fb_button.click();
    browser.sleep(3000);
    //Sign in with to popup
    await browser.getAllWindowHandles().then(async handles => {
      var popupHandle = handles[1];
      await browser.switchTo().window(popupHandle);
      //perform operations
      await fb_email.sendKeys(fb_emailid);
      await fb_pass.sendKeys(fb_password);
      await fb_login.click();
      browser.sleep(5000);
      //Back to Previous Window
      await browser.driver.switchTo().window(handles[0]);
      browser.sleep(3000);
    });
  };

  this.Logout = async () => {
    browser.sleep(3000);
    await profile_pic.click();
    await logout.click();
  };
};
module.exports = new LoginPO();
