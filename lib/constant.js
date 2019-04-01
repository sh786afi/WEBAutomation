var LOCATOR_SIGNUP = {
  name: $('[ng-focus="signUpNameFocus"]'),
  email: $('[ng-blur="checkEmail($event)"]'),
  pass: $('[ng-model="signUpPass"]'),
  dob: $('[ng-focus="signUpDobFocus"]'),
  date: element(
    by.xpath('//*[@id="signupDobDiv"]/div/table/tbody/tr[5]/td[4]/a')
  ),
  signup_button: $('[ng-click="signup($event)"]'),
  splash_next_1: $('[ng-click="nextHelpWebAdd()"]'),
  splash_next_2: $('[ng-click="nextHelpWebFeeds()"]'),
  splash_getstarted: $('[ng-click="landOnFeeds()"]'),
  submit_location: $('[ng-click="confirmLocation($event,1)"]')
};
var LOCATOR_LOGIN = {
  login_signup_link: element(
    by.xpath('//*[@id="contHt"]/div[1]/div[2]/div[9]/div[1]/div[2]')
  ),
  fb_button: element(by.id("fbBtnGlobal")),
  fb_email: element(by.id("email")),
  fb_pass: element(by.id("pass")),
  fb_login: element(by.id("loginbutton")),
  offer: element(by.id("newCloseIcon")),
  profile_pic: element(by.css('[ng-show="loggedInUser"]')),
  logout: element(by.xpath('//*[@id="usersetting1"]/div/a[3]/div')),
  login_button: element(
    by.xpath("//div[@class='landing-nav regular opacity50 transition300']")
  ),
  click_login: element(by.id("loginspan")),
  email: element(by.id("email_Id")),
  password: element(by.xpath("(//input[@type='password'])[5]")),
  sign_in: element(
    by.xpath(
      "//div[@class='landing-button-signup  f_l15Imp f_m14 f_s14 transition300 cursor_pointer']"
    )
  ),
  close_app: $('[onclick="closeAddPart()"]')
};
var LOCATOR_STORY = {
  click_add: $('[onclick="add_panel()"]'),
  click_add_story: element(
    by.xpath(
      "//div[@class='row display_flex flexdir_row brdBtm align_center py_10 pl_20 hoverPanel']"
    )
  ),
  enter_bLI: $('[ng-model="storyBLI"]'),
  click_done: $('[ng-click="doneWithBLI($event)"]'),
  click_yes: element(
    by.xpath("(//div[@class='col l1_1 f_l12 align_center lh25 poR'])[3]")
  ),
  click_no: element(
    by.xpath("//*[@id='m16Story']/div[1]/div[2]/div/div[2]/div/label")
  ),
  select_dropdown: element(
    by.xpath(
      "//div[@class='row h55 f_m13 f_s13 f_l13 regular icon ic-story inStory poR dark_brd poR createBucket-0']"
    )
  ),
  enter_date: element(by.id("createMonthStory")),
  enter_year: element(by.id("createYearStory")),
  click_next: element(by.id("bliBtn")),
  cover_image: element(by.xpath("//div[@class='forCntr']")),
  click_title: element(
    by.xpath("//input[@class='storyTitle fLeft  txtOver ng-scope']")
  ),
  click_image_video: element(
    by.xpath("//label[@class='story_btns transition200 icon ic-imagevideo']")
  ),
  click_add_text: element(by.id("addTextBtn")),
  text_title1: element(
    by.xpath("(//input[@class='storyTitle storyTxt2 fLeft'])[1]")
  ),
  text_title2: element(
    by.xpath("(//input[@class='storyTitle storyTxt2 fLeft'])[2]")
  ),
  add_description1: $('[onkeypress="common.checkLength(this,event)"]'),
  add_description2: element(
    by.xpath("//div[@class='storyTxt fLeft editable']")
  ),
  click_back: element(by.xpath("(//div[@class='hback transition200'])[3]")),
  save_story: element(
    by.xpath(
      "(//div[@class='story_publish_button_save transition300  saveBtnE'])[2]"
    )
  ),
  publish_story: element(
    by.xpath(
      "(//div[@class='story_publish_button transition300 publishBtnE ng-scope'])[5]"
    )
  ),
  click_publish_yes: element(
    by.xpath("//div[@class='deleteBtn woovly_bg5 fright publishBtnE']")
  ),
  background_text: element(
    by.xpath("(//div[@class='clComm fLeft transition100 bgColl1'])")
  ),
  text_align: element(by.xpath("//div[@class='alignbg4']")),
  text_font: element(
    by.xpath("//*[@id='storyTextSection']/div[2]/div[5]/div[2]/div[5]")
  )
};
var LOCATOR_OTHERPROFILE = {
  click_otherUser: element(by.xpath("//*[@id='mainFeeds']/div[1]/div/div[2]/div[2]/div[2]/div[1]/div[1]/div[1]/div/div[1]/div[1]/span/a")),
  addOthersBucket: element(by.xpath("//*[@id='profilePage']/div[6]/div/div[2]/div[1]/div[2]/div[3]/div[1]/div[1]/div[1]/div"))
}
module.exports = { LOCATOR_SIGNUP, LOCATOR_LOGIN, LOCATOR_STORY, LOCATOR_OTHERPROFILE };
