var { LOCATOR_OTHERPROFILE } = require("../lib/constant");
var exp_desc_1 = $('[ng-click="openPostPanel($event)"]');
  var exp_desc_2 = $('[ng-click="divFocusVal($event)"]');
  var done_button=element(by.xpath("//*[@id='swipe']/div[1]/div[4]"))
  var mm = element(by.xpath('//*[@id="month_Month"]'));
  var yyyy = element(by.xpath('//*[@id="month_Year"]'));
  var date_done = $('[ng-click="accomplishedDone()"]');
  var click_yes=element(by.xpath('//*[@id="add13"]/div[1]/div[2]/div[1]/div/label'));
  var rating_1 = $('[ng-click="showRating()"]');
  var rating_2 = $('[ng-click="setRating(4)"]');
  var rating_done = element(
    by.xpath('//*[@id="excitmentPanel"]/div[1]/div[2]')
  );

  var location = $('[ng-click="openLocation()"]');
  var location_tag = $('[ng-model="placesTerm"]');
  var select_location = element(
    by.xpath('//*[@id="addLocation"]/div[2]/div/div[2]/div[1]/div[2]')
  );

  var tag_people = $('[ng-click="openPeopeTaging()"]');
  var tag_people_1 = $('[ng-model="userTerm"]');
  var select_tag_people = $('[ng-click="selecTaggedUser(sf)"]');
  var tag_done = $('[ng-click="userSelection()"]');
  var finish_button = $('[ng-click="finalAddBLI($event)"]');

var addOthersBucket = function() {
this.addBucket = async () => {
    browser.sleep(5000);
    await LOCATOR_OTHERPROFILE.click_otherUser.click();
    browser.sleep(2000)
    await LOCATOR_OTHERPROFILE.addOthersBucket.click();
    browser.sleep(5000);
  };
  this.expDesc = function(exp) {
    exp_desc_1.click();
    browser.sleep(2000);
    exp_desc_2.sendKeys(exp);
    done_button.click();
  };
  this.mmYyyy = function(m, y) {

    browser.sleep(1000);
    click_yes.click();
    mm.clear().sendKeys(m);
    browser.sleep(500);
    yyyy.clear().sendKeys(y);
    date_done.click();
    browser.sleep(1000);
  };
  this.feedBackLocTag = function(loc, tag) {
    browser.sleep(1000);
    rating_1.click();
    browser.sleep(1000);
    rating_2.click();
    browser.sleep(1000);
    rating_done.click();
    browser.sleep(1000);

    location.click();
    browser.sleep(1000);
    location_tag.sendKeys(loc);
    browser.sleep(2000);
    select_location.click();
    browser.sleep(1000);

    tag_people.click();
    browser.sleep(1000);
    tag_people_1.sendKeys(tag);
    browser.sleep(2000);
    select_tag_people.click();
    browser.sleep(1000);
    tag_done.click();
    browser.sleep(1000);
  };
  this.finish = function() {
    finish_button.click();
    browser.sleep(1000);
  };
}
module.exports = new addOthersBucket();