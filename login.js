var LoginPO = function() {
  var signup_singin_link = element(
    by.xpath('//*[@id="contHt"]/div[1]/div[2]/div[9]/div[1]/div[2]')
  );
  var sign_in_link = element(by.id("loginspan"));
  var email_id = element(by.model("loginEmail"));
  var password = element(by.model("loginPassword"));
  var singin_button = element(by.xpath('//*[@id="signinFields"]/div[3]'));
  var google_button = element(by.xpath('//*[@id="googleLbtn2"]/div/div'));
  var google_email_id = element(by.id("identifierId"));
  var google_email_id_next = element(by.id("identifierNext"));
  var google_password = element(
    by.xpath('//*[@id="password"]/div[1]/div/div[1]/input')
  );
  var google_password_next = element(by.id("passwordNext"));
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
  this.emailLogin = function(emailid, pass) {
    browser.sleep(2000);
    sign_in_link.click();
    email_id.sendKeys(emailid);
    password.sendKeys(pass);
    browser.sleep(2000);
    singin_button.click();
    browser.sleep(5000);
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
  this.googleLogin = async (google_emailid, google_pass) => {
    await google_button.click();
    //Sign in with to popup
    await browser.getAllWindowHandles().then(async handles => {
      var popupHandle = handles[1];
      await browser.switchTo().window(popupHandle);
      //perform operations
      await google_email_id.sendKeys(google_emailid);
      await google_email_id_next.click();
      await google_password.sendKeys(google_pass);
      await google_password_next.click();
      //Back to Previous Window
      await browser.driver.switchTo().window(handles[0]);
    });
  };

  this.fbLogin = async (fb_emailid, fb_password) => {
    await fb_button.click();
    //Sign in with to popup
    await browser.getAllWindowHandles().then(async handles => {
      var popupHandle = handles[1];
      await browser.switchTo().window(popupHandle);
      //perform operations
      await fb_email.sendKeys(fb_emailid);
      await fb_pass.sendKeys(fb_password);
      await fb_login.click();
      //Back to Previous Window
      await browser.driver.switchTo().window(handles[0]);
    });
  };

  this.Logout = async () => {
    browser.sleep(3000);
    await profile_pic.click();
    await logout.click();
  };

  this.getGreetingText = function() {
    return greeting.getText();
  };
};
module.exports = new LoginPO();
