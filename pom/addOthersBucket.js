var { LOCATOR_OTHERPROFILE } = require("../lib/constant");

var addOthersBucket = function() {
  this.addBucket = async () => {
    browser.sleep(5000);
    await LOCATOR_OTHERPROFILE.click_otherUser.click();
    browser.sleep(2000);
    await LOCATOR_OTHERPROFILE.addOthersBucket.click();
    browser.sleep(5000);
  };
  this.expDesc = function(exp) {
    LOCATOR_OTHERPROFILE.exp_desc_1.click();
    browser.sleep(2000);
    LOCATOR_OTHERPROFILE.exp_desc_2.sendKeys(exp);
    LOCATOR_OTHERPROFILE.done_button.click();
  };
  this.mmYyyy = function(m, y) {
    browser.sleep(1000);
    if (LOCATOR_OTHERPROFILE.click_yes == true) {
      LOCATOR_OTHERPROFILE.click_yes.click();
      LOCATOR_OTHERPROFILE.mm.clear().sendKeys(m);
      browser.sleep(500);
      LOCATOR_OTHERPROFILE.yyyy.clear().sendKeys(y);
      LOCATOR_OTHERPROFILE.date_done.click();
      browser.sleep(1000);
    }
  };
  this.feedBackLocTag = function(loc, tag) {
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.rating_1.click();
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.rating_2.click();
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.rating_done.click();
    browser.sleep(1000);

    LOCATOR_OTHERPROFILE.location.click();
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.location_tag.sendKeys(loc);
    browser.sleep(2000);
    LOCATOR_OTHERPROFILE.select_location.click();
    browser.sleep(1000);

    LOCATOR_OTHERPROFILE.tag_people.click();
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.tag_people_1.sendKeys(tag);
    browser.sleep(2000);
    LOCATOR_OTHERPROFILE.select_tag_people.click();
    browser.sleep(1000);
    LOCATOR_OTHERPROFILE.tag_done.click();
    browser.sleep(1000);
  };
  this.finish = function() {
    LOCATOR_OTHERPROFILE.finish_button.click();
    browser.sleep(1000);
  };
};
module.exports = new addOthersBucket();
