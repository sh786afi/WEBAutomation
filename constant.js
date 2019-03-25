var LOCATOR_SIGNUP = {
    name: $('[ng-focus="signUpNameFocus"]'),
    email: $('[ng-blur="checkEmail($event)"]'),
    pass: $('[ng-model="signUpPass"]'),
    dob: $('[ng-focus="signUpDobFocus"]'),
    date: element(by.xpath('//*[@id="signupDobDiv"]/div/table/tbody/tr[5]/td[4]/a')),
    signup_button: $('[ng-click="signup($event)"]'),
    splash_next_1: $('[ng-click="nextHelpWebAdd()"]'),
    splash_next_2: $('[ng-click="nextHelpWebFeeds()"]'),
    splash_getstarted: $('[ng-click="landOnFeeds()"]'),
    submit_location: $('[ng-click="confirmLocation($event,1)"]')
};
var LOCATOR_LOGIN = {
    login_signup_link: element(by.xpath('//*[@id="contHt"]/div[1]/div[2]/div[9]/div[1]/div[2]')),
    fb_button: element(by.id("fbBtnGlobal")),
    fb_email: element(by.id("email")),
    fb_pass: element(by.id("pass")),
    fb_login: element(by.id("loginbutton")),
    offer: element(by.id("newCloseIcon")),
    profile_pic: element(by.css('[ng-show="loggedInUser"]')),
    logout: element(by.xpath('//*[@id="usersetting1"]/div/a[3]/div'))
};
module.exports = { LOCATOR_SIGNUP, LOCATOR_LOGIN }