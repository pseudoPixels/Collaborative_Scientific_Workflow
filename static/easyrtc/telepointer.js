var all_occupants_list = ""; //list of easyrtcid of all the logged in clients
var all_occupants_details = []; //list of logged in clients along with email, name and corresponding easyrtcid
var selfEasyrtcid = ""; //my own easyrtc id

//user info required for rtc
var user_name = "";
var user_email = "";


$(document).ready(function(){
    user_name = $("#user_name").text();
    user_email = $("#user_email").text();


    //chat room communication
    $("#chatRoom_send_msg_btn").click("on", function(){

        var text = $("#chatRoom_send_msg_txt").val(); //get the msg content

        if(text.replace(/\s/g, "").length === 0) { // Don"t send just whitespace
            return;
        }

        //empty the text box for further msg
        $("#chatRoom_send_msg_txt").val("");

        //create the telegram for all the clients.
        //as its a chat room msg, we don't specify the reciever.
        var telegram = {"sender": user_name, "msg": text};
        var telegram_for_myself = {"sender": "Me", "msg": text};

        //add to my chat room conversation
        addToChatRoomConversation(telegram_for_myself);

        //and also send to all other clients for adding to their chat room conversation
        notifyAll("chat_room_msg", telegram);

    });



        //Collaborative white board
    var canvas = document.getElementById("mycanvas");
    var context = canvas.getContext('2d');

    var clickX = new Array();
    var clickY = new Array();
    var clickDrag = new Array();
    var paint;

    function addClick(x, y, dragging) {
      clickX.push(x);
      clickY.push(y);
      clickDrag.push(dragging);
    }


    $('#mycanvas').mousedown(function(e) {
            var rect = e.currentTarget.getBoundingClientRect(),
          offsetX = e.clientX - rect.left,
          offsetY = e.clientY - rect.top;

      var mouseX = e.pageX - this.offsetLeft;
      var mouseY = e.pageY - this.offsetTop;



      paint = true;
      addClick(offsetX, offsetY);
      redraw();
    });


    $('#mycanvas').mousemove(function(e) {
            var rect = e.currentTarget.getBoundingClientRect(),
          offsetX = e.clientX - rect.left,
          offsetY = e.clientY - rect.top;

          //alert(offsetX);

      if (paint) {
        addClick(offsetX, offsetY, true);
        redraw();
      }
    });


    $('#mycanvas').mouseup(function(e) {
      paint = false;
    });


    $('#mycanvas').mouseleave(function(e) {
      paint = false;
    });


    function redraw() {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

      context.strokeStyle = "#df4b26";
      context.lineJoin = "round";
      context.lineWidth = 3;

      for (var i = 0; i < clickX.length; i++) {
        context.beginPath();
        if (clickDrag[i] && i) {
          context.moveTo(clickX[i - 1], clickY[i - 1]);
        } else {
          context.moveTo(clickX[i] - 1, clickY[i]);
        }
        context.lineTo(clickX[i], clickY[i]);
        context.closePath();
        context.stroke();
      }
    }
    //collaborative white board ends



    //Hidden Display controls
    $("#id_collaborativeToolsDiv").click("on", function(){
        $("#collaboration_tools").toggle(750);
    });





});



$(document).mousemove(function(e){
    var my_telepointer_info = {"left":e.pageX-50,
                             "top":e.pageY-50,
                             "email":user_email,
                             "rtcid": selfEasyrtcid,
                             "user_name":user_name
                            };

    notifyAll("telepointer_info", my_telepointer_info);


});










//Notify all the other clients of the message with the passed message type.
function notifyAll(messageType, message){
    //loop through all the other clients and send the message.
    for(var otherEasyrtcid in all_occupants_list) {
            easyrtc.sendDataWS(otherEasyrtcid, messageType,  message);
    }
}










//Message reciver for the message sent from other clients.
//this method performs actions according to the received msgType
function onMessageRecieved(who, msgType, content) {

    switch(msgType) {
        case "telepointer_info":
            updateTelepointer(content);
            break;
        case "inform_my_details_to_all_other_clients":
            addNewClientToAllOccupantsDetails(content);
            updateOnlineStatusOfClients(all_occupants_details);
            break;
        case "disconnected":
            alert("Disconnected : " + content);
            break;
        case "chat_room_msg":
            addToChatRoomConversation(content);
            break;

    }
}


//add the newly obtained client details to the list (e.g. like phonebook)
function addNewClientToAllOccupantsDetails(newClientDetails){
    all_occupants_details.push(newClientDetails);
}


function addToChatRoomConversation(telegram){
  // Escape html special characters, then add linefeeds.
  var content = telegram.msg;
  var sender = telegram.sender;
  content = content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  content = content.replace(/\n/g, "<br />");

  sender = "<strong>" + sender + "</strong>";

  var previous_messages = $("#chatRoom_all_msg").html();

  $("#chatRoom_all_msg").html(previous_messages + sender + ": " +content + "<br/>");

}


//update online status based on the available clients
function updateOnlineStatusOfClients(all_occupants_details){
    //first every user's status label to offline
    $(".online_status").text(' (Offline) ').css('color', '#C0C0C0');

    //then update the online status based on logged in clients.
    for(var i=0; i<all_occupants_details.length; i++){
        var userEmail = all_occupants_details[i].email;
        $('#online_status_'+convertEmailToID(userEmail)).text(' (Online) ').css('color', '#0f0');
    }
}







function convertEmailToID(email){
    //an email to be id, must not contain some special characters
    //TODO: currently removed occurance of any . or @ by _ need to handle other special characters too
    return email.replace(/\.|@/g, '_');
}





function connect() {
    easyrtc.setSocketUrl(":8080");
    easyrtc.setPeerListener(onMessageRecieved);
    easyrtc.setRoomOccupantListener(userLoggedInListener);
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
}



//callback function, called upon new client connection or disconnection
function userLoggedInListener (roomName, occupants, isPrimary) {
    //update the global occupants list for this user.
    all_occupants_list = occupants;

    //as this callback method is also called on any user disconnection...
    //remove any 'zombie' easyrtc id from 'all_occupants_details' variable
    removeZombieClientsFromOccupantsDetails(occupants);

    //update the online/offline status as per the new list.
    //this update is important for someone leaves the connection.
    updateOnlineStatusOfClients(all_occupants_details);

    //spawn telepointers for the logged in users.
    spawnTelepointers(occupants);

    //inform my email, name along with easyrtc id, which is later used for different tracking
    informMyDetailsToAllOtherClients(occupants);

    //notifyAll('disconnected', "Hello");
}


//removes any invalid ids (the users of whom have left/disconnect)
//from the server. the passed occupants is the updated list of easyrctid
//the occupants_details are updated (removed the invalids) accordingly
function removeZombieClientsFromOccupantsDetails(occupants){
    var temp_occupants_details = [];

    for(var i=0;i < all_occupants_details.length; i++){
        var aClient = all_occupants_details[i];

        var isValid = 0;

        for(aEasyrtcid in occupants){
            if(aEasyrtcid == aClient.easyrtcid){
                isValid = 1; //this client is still on the list and online (connected and valid)
                break;
            }
        }

        //add the valid client to the temporary updated list
        if(isValid ==1){
            temp_occupants_details.push(aClient);
        }

    }

    //finally assign the temp new occupants details as the updated occupants details.
    all_occupants_details = temp_occupants_details;


}





//inform all other clients about my details: name, email, easyrtcid
//these additional info along with easyrtcid (which is available in
//'all_occupants_list') are used for mapping (e.g. which easyrtcid
//is for which emails and so on)
function informMyDetailsToAllOtherClients(occupants){
    var myInfo = {'email': $("#user_email").text(), 'easyrtcid': selfEasyrtcid, 'name': $("#user_name").text()};

    //notify all other clients for email for corresponding easyrtcid
    notifyAll('inform_my_details_to_all_other_clients', myInfo);
}







//spawn the telepointers for the passed occupants
function spawnTelepointers(occupants){

    //==================================================
    //spawn the telepointers for all the connected users.
    //==================================================
    var telepointer_spawn_point = document.getElementById('telepointer_spawn_point');
    //first remove any existing telepointer for a fresh start
    while (telepointer_spawn_point.hasChildNodes()) {
        telepointer_spawn_point.removeChild(telepointer_spawn_point.lastChild);
    }
    //and then create elements for occupants with corresponding easyrtcid
    for(var easyrtcid in occupants) {
            var ele = document.createElement("div");
            ele.setAttribute("id","telepointer_name_"+easyrtcid);

            ele.style.color = "#000";
            ele.style.backgroundColor =  "#fff";
            ele.style.boxShadow = "2px 2px 3px grey";
            //ele.setAttribute("class","inner");
            //ele.innerHTML="hi "+easyrtcid;
            telepointer_spawn_point.appendChild(ele);
    }
}












//update the telepointer for the other clients
//the 'content' should contain the required info for telepointer update
//along with other client easyrtcid; which is used for selecting the specific
//element from dom
function updateTelepointer(content){
    //telepointer was spawned according to the easyrtc id.
    //telepointer selected first and then updatee the css for rendering
    $('#telepointer_name_'+content.rtcid).css({position:'absolute',left:parseInt(content.left), top:parseInt(content.top)});
    if($('#telepointer_name_'+content.rtcid).text()=="")$('#telepointer_name_'+content.rtcid).html(content.user_name);

}








function sendStuffWS(otherEasyrtcid) {
    var text = document.getElementById('sendMessageText').value;
    if(text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }

    easyrtc.sendDataWS(otherEasyrtcid, "message",  text);
    addToConversation("Me", "message", text);
    document.getElementById('sendMessageText').value = "";
}







function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
    //document.getElementById("iam").innerHTML = "I am " + easyrtcid;
}







function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}

