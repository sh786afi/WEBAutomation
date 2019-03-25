var AddStory = function() {
  var data = require("../conf.js");
  var user_login = require("../pom/login");
  var path = require("path");
  var fs = require("fs");

  var click_add = $('[onclick="add_panel()"]');
  var click_add_story = element(
    by.xpath(
      "//div[@class='row display_flex flexdir_row brdBtm align_center py_10 pl_20 hoverPanel']"
    )
  );
  var enter_bLI = $('[ng-model="storyBLI"]');
  var click_done = $('[ng-click="doneWithBLI($event)"]');
  var click_yes = element(
    by.xpath("(//div[@class='col l1_1 f_l12 align_center lh25 poR'])[3]")
  );
  var click_no = element(
    by.xpath("//*[@id='m16Story']/div[1]/div[2]/div/div[2]/div/label")
  );
  var select_dropdown = element(
    by.xpath(
      "//div[@class='row h55 f_m13 f_s13 f_l13 regular icon ic-story inStory poR dark_brd poR createBucket-0']"
    )
  );
  var enter_date = element(by.id("createMonthStory"));
  var enter_year = element(by.id("createYearStory"));
  var click_next = element(by.id("bliBtn"));
  var cover_image = element(by.xpath("//div[@class='forCntr']"));
  var click_title = element(
    by.xpath("//input[@class='storyTitle fLeft  txtOver ng-scope']")
  );
  var click_image_video = element(
    by.xpath("//label[@class='story_btns transition200 icon ic-imagevideo']")
  );
  var click_add_text = element(by.id("addTextBtn"));
  var text_title1 = element(
    by.xpath("(//input[@class='storyTitle storyTxt2 fLeft'])[1]")
  );
  var text_title2 = element(
    by.xpath("(//input[@class='storyTitle storyTxt2 fLeft'])[2]")
  );
  var add_description1 = $('[onkeypress="common.checkLength(this,event)"]');
  var add_description2 = element(
    by.xpath("//div[@class='storyTxt fLeft editable']")
  );
  var click_back = element(
    by.xpath("(//div[@class='hback transition200'])[3]")
  );
  var save_story = element(
    by.xpath(
      "(//div[@class='story_publish_button_save transition300  saveBtnE'])[2]"
    )
  );
  var publish_story = element(
    by.xpath(
      "(//div[@class='story_publish_button transition300 publishBtnE ng-scope'])[5]"
    )
  );
  var click_publish_yes = element(
    by.xpath("//div[@class='deleteBtn woovly_bg5 fright publishBtnE']")
  );
  var background_text = element(
    by.xpath("(//div[@class='clComm fLeft transition100 bgColl1'])")
  );
  var text_align = element(by.xpath("//div[@class='alignbg4']"));
  var text_font = element(
    by.xpath("//*[@id='storyTextSection']/div[2]/div[5]/div[2]/div[5]")
  );

  // ============ Add Story =============

  async function clickAdd() {
    await click_add.click();
  }

  async function clickAddStory() {
    await click_add_story.click();
  }

  async function enterBLIName(Bkt_name) {
    await enter_bLI.click();
    await enter_bLI.sendKeys(Bkt_name);
  }

  async function clickYes() {
    await click_yes.click();
  }

  async function clickNo() {
    await click_no.click();
  }

  async function clickImDone() {
    await click_done.click();
  }

  async function selectDropdown() {
    await select_dropdown.click();
  }

  async function enterDate(month) {
    await enter_date.click();
    await enter_date.sendKeys(month);
  }

  async function enterYear(year) {
    await enter_year.click();
    await enter_year.sendKeys(year);
  }

  async function clickNext() {
    await click_next.click();
  }

  async function coverImageClick() {
    await cover_image.click();
  }

  async function sendTitle(title) {
    await click_title.click();
    await click_title.sendKeys(title);
  }

  async function clickImageVideo() {
    await click_image_video.click();
  }

  async function clickAddText() {
    await click_add_text.click();
  }

  async function textTitle1(title) {
    await text_title1.click();
    await text_title1.sendKeys(title);
  }

  async function addDescription1(Desc) {
    await add_description1.click();
    await add_description1.sendKeys(Desc);
  }

  async function textTitle2(title) {
    await text_title2.click();
    await text_title2.sendKeys(title);
  }

  async function addDescription2(Desc) {
    await add_description2.click();
    await add_description2.sendKeys(Desc);
  }

  async function clickBack() {
    await click_back.click();
  }

  async function saveStory() {
    await save_story.click();
  }

  async function publishStory() {
    await publish_story.click();
  }

  async function clickYesToPublish() {
    await click_publish_yes.click();
  }

  async function backgroundText() {
    await background_text.click();
  }

  async function textAlign() {
    await text_align.click();
  }

  async function textFont() {
    await text_font.click();
  }

  // ================== Image Upload ========================
  // Cover image upload
  async function uploadImage(dirpath, image_count) {
    var dirabsolutePath = path.resolve(__dirname, dirpath);
    console.log(dirabsolutePath);
    fs.readdir(dirabsolutePath, (err, files) => {
      browser.sleep(2000);
      for (i = 0; i < image_count; i++) {
        console.log(files[i]);
        var j = user_login.getRandomInt(1, files.length - 1);
        var fullPath = path.resolve(dirabsolutePath, files[j]);
        console.log(fullPath);
        var absolutePath = path.resolve(__dirname, fullPath);
        browser.sleep(2000);
        var fileElem = element(by.id("forCoverImage"));
        fileElem.sendKeys(absolutePath);
        browser.sleep(7000);
      }
    });
  }

  // ============= Output Created Story Function ==============

  this.Get_New_Story1 = async function(BLIname) {
    await clickAdd();
    await clickAddStory();
    await enterBLIName(BLIname);
    await selectDropdown();
    browser.sleep(2000);
    await enterDate("24");
    await enterYear("2030");
    await clickNext();
    browser.sleep(4000);
    await uploadImage(data.config.params.uploadImage, 1);
    browser.sleep(10000);
    await sendTitle("Automated Story id" + " " + data.config.params.ran);
    console.log(data.config.params.ran);
    browser.sleep(4000);
    await clickAddText();
    await textTitle1("Chennai");
    browser.sleep(2000);
    browser.executeScript("window.scrollTo(0,500)");
    browser.sleep(3000);
    await addDescription1(
      "Chennai, on the Bay of Bengal in eastern India, is the capital of the state of Tamil Nadu. The city is home to Fort St. George, built in 1644 and now a museum showcasing the city’s roots as a British military garrison and East India Company trading outpost, when it was called Madras. Religious sites include Kapaleeshwarar Temple, adorned with carved and painted gods, and St. Mary’s, a 17th-century Anglican church"
    );
    browser.sleep(5000);
    await backgroundText();
    browser.sleep(2000);
    await textAlign();
    browser.sleep(2000);
    await publishStory();
    browser.sleep(2000);
    await clickYesToPublish();
  };

  this.Get_New_Story2 = async function(BLIname) {
    await clickAdd();
    await clickAddStory();
    await enterBLIName(BLIname);
    await selectDropdown();
    await clickNext();
    browser.sleep(4000);
    await uploadImage(data.config.params.uploadImage, 1);
    browser.sleep(10000);
    await sendTitle("Automated Story id" + " " + data.config.params.ran1);
    console.log(data.config.params.ran1);
    browser.sleep(4000);
    await clickAddText();
    await textTitle1("The Himalayas");
    browser.sleep(2000);
    browser.executeScript("window.scrollTo(0,500)");
    browser.sleep(3000);
    await addDescription1(
      "The Himalayas, or Himalaya, form a mountain range in Asia, separating the plains of the Indian subcontinent from the Tibetan Plateau. The Himalayan range has many of the Earth's highest peaks, including the highest, Mount Everest."
    );
    browser.sleep(5000);
    await backgroundText();
    browser.sleep(2000);
    await textFont();
    browser.sleep(2000);
    await saveStory();
    browser.sleep(2000);
  };

  this.Get_New_Story3 = async function() {
    await clickAdd();
    await clickAddStory();
    await enterBLIName("Story 2 with New Bucket id " + data.config.params.ran1);
    browser.sleep(2000);
    await clickImDone();
    browser.sleep(20000);
    await clickNo();
    browser.sleep(2000);
    await enterDate("10");
    await enterYear("2030");
    await clickNext();
    browser.sleep(3000);
    await uploadImage(data.config.params.uploadImage, 1);
    browser.sleep(10000);
    await sendTitle("Automated Story id" + " " + data.config.params.ran1);
    console.log(data.config.params.ran);
    await clickAddText();
    await textTitle1("The Himalayas");
    browser.sleep(2000);
    browser.executeScript("window.scrollTo(0,500)");
    browser.sleep(3000);
    await addDescription1(
      "The Himalayas, or Himalaya, form a mountain range in Asia, separating the plains of the Indian subcontinent from the Tibetan Plateau. The Himalayan range has many of the Earth's highest peaks, including the highest, Mount Everest."
    );
    browser.sleep(4000);
    await backgroundText();
    browser.sleep(4000);
    await saveStory();
    browser.sleep(3000);
  };
};
module.exports = new AddStory();
