var { LOCATOR_Featured, LOCATOR_PROFILE } = require("../lib/constant");
var data = require("../conf.js");
var { uploadImage } = require("../lib/common");
var myProfile = function() {
  this.clickProfile = async () => {
    await LOCATOR_Featured.click_profile.click();
    await LOCATOR_Featured.click_myProfile.click();
  };
  this.addProfilePic = async () => {
    if (LOCATOR_PROFILE.click_add == true) {
      await LOCATOR_PROFILE.click_add.click();
      browser.sleep(2000);
      await uploadImage(
        data.config.params.uploadImage,
        1,
        LOCATOR_PROFILE.click_changePhoto
      );
      browser.sleep(10000);
      await LOCATOR_PROFILE.click_savePic.click();
    } else {
      await LOCATOR_PROFILE.click_profileImg.click();
      await uploadImage(
        data.config.params.uploadImage,
        1,
        LOCATOR_PROFILE.click_saveImgProfile
      );
      browser.sleep(10000);
      await LOCATOR_PROFILE.click_saveProImgButton.click();
    }
  };
  this.deleteProfilePic = async () => {
    if (LOCATOR_PROFILE.click_add == true) {
      await LOCATOR_PROFILE.click_add.click();
      browser.sleep(2000);
      await uploadImage(
        data.config.params.uploadImage,
        1,
        LOCATOR_PROFILE.click_changePhoto
      );
      browser.sleep(10000);
      await LOCATOR_PROFILE.click_savePic.click();
    } else {
      await LOCATOR_PROFILE.click_profileImg.click();
      browser.sleep(2000);
      await LOCATOR_PROFILE.click_deleteProPic.click();
      await LOCATOR_PROFILE.close_profileImgWin.click();
    }
  };
  this.uploadCoverImg = async () => {
    await LOCATOR_PROFILE.click_coverImg.click();
    browser.sleep(2000);
    await uploadImage(
      data.config.params.uploadImage,
      1,
      LOCATOR_PROFILE.upload_coverImg
    );
    browser.sleep(10000);
    await LOCATOR_PROFILE.save_coverImg.click();
  };
  this.deleteCoverImg = async () => {
    await LOCATOR_PROFILE.click_coverImg.click();
    browser.sleep(2000);
    await LOCATOR_PROFILE.delete_coverImg.click();
  };
};
module.exports = new myProfile();
