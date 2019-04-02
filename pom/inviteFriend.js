var InviteFriend = function () {
    // For Invite Friend google Login needed    
    var login = require('../pom/login');

    var click_invite = element(by.xpath("(//div[@class='row fleft h60 align_center invite_friends_panel poR regular f_l13 pxy_20 mb_10 lh25 bradius mb_10 cursor_pointer poR'])[1]"));
    var enter_email = element(by.id("mailTxt"));
    var click_to_add = element(by.xpath("//div[@class='add_bli_btn_suggested ic-plus-fill  fright']"));
    var invite_submit = element(by.xpath("//*[@id='likers']/div/div[3]/div[2]"));
    var close_invite = $('[ng-click="closeInviteList()"]');
    var remove_email = $('[ng-click="removeThisMail($index)"]');
    var send_invite = element(by.xpath("(//div[@class='inviteBtn f_l12 f_m12 f_s12 semibold ml_5 fright px_25'])"));

    // ============ Invite Friend =============

    async function clickInvite() {
        await click_invite.click();
    };

    async function emailClick(friend_email) {
        await enter_email.click();
        await enter_email.sendKeys(friend_email);
    };

    async function clickToAdd() {
        await click_to_add.click();
    };

    async function inviteSubmit() {
        await invite_submit.click();
    };

    async function closeInvite() {
        await close_invite.click();
    };

    async function removeEmail() {
        await remove_email.click();
    };

    async function sendGoogleInvite() {
        await send_invite.click();
    };

    // ============= Output Invite Function ==============

    this.Get_Invite_Friends1 = async function (friend_email) {
        await clickInvite();
        browser.sleep(2000);
        console.log('cliccckkkk')
        await emailClick(friend_email);
        console.log('emaill checkkk')
        await clickToAdd();
        console.log('click ato addd');
        browser.sleep(4000)
        await inviteSubmit();
        console.log('invite submitttt');

        browser.sleep(4000);
    };

    this.Get_Invite_Friends2 = async function (friend_email) {
        await clickInvite();
        browser.sleep(2000);
        await emailClick(friend_email);
        await clickToAdd();
        browser.sleep(500);
        await closeInvite();
    };

    this.Get_Invite_Friends3 = async function (friend_email) {
        await clickInvite();
        browser.sleep(2000);
        await emailClick(friend_email);
        await clickToAdd();
        browser.sleep(1000);
        await removeEmail();
        browser.sleep(500);
        await closeInvite();
    };

    this.Get_Google_Invite_Friends = async function (gmail, pass) {
        await clickInvite();
        browser.sleep(3000);
        await login.Get_Google_Invite_Login(gmail, pass);
        browser.sleep(4000);
        await sendGoogleInvite();
        browser.sleep(3000);
    };
};
module.exports = new InviteFriend();