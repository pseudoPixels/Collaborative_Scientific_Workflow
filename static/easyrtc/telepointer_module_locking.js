var all_occupants_list = ""; //list of easyrtcid of all the logged in clients
var all_occupants_details = []; //list of logged in clients along with email, name and corresponding easyrtcid
var selfEasyrtcid = ""; //my own easyrtc id

//user info required for rtc
var user_name = "";
var user_email = "";



//IMPORTANT
//this id remain unique throughout the pipeline for a module
var unique_module_id = 1;



$(document).ready(function(){

//========================================================
//================ ALL INITIALIZATION CODES STARTS =======
//========================================================

    //connect and login to the easyrtc node server.
    connect();


    //get the user required information from the DOM
    user_name = $("#user_name").text();
    user_email = $("#user_email").text();





//========================================================
//================ ALL INITIALIZATION CODES ENDS =========
//========================================================












//========================================================
//===================== COLLABORATION CODE STARTS ========
//========================================================

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

    $("#id_chatRoomDiv").click("on", function(){
        $("#chatRoom").toggle(750);
    });

    $("#id_canvasDiv").click("on", function(){
        $("#whiteBoard").toggle(750);
    });

    $("#id_workflow_tree_view").click("on", function(){
        $("#tree-simple").toggle(750);
    });


//========================================================
//===================== COLLABORATION CODE ENDS ==========
//========================================================
















//========================================================
//===================== EASYRTC CODE STARTS ==============
//========================================================


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

//========================================================
//===================== EASYRTC CODE ENDS ================
//========================================================



















//========================================================
//============= WORKFLOW CONTROL CODE STARTS =============
//========================================================

  //tree implementation starts
  function Node(data) {
    this.data = data;
    this.parent = null;
    this.children = [];
  }

  function Tree(data) {
    var node = new Node(data);
    this._root = node;
  }

  Tree.prototype.traverseDF = function(callback) {

    // this is a recurse and immediately-invoking function
    (function recurse(currentNode) {
      // step 2
      for (var i = 0, length = currentNode.children.length; i < length; i++) {
        // step 3
        recurse(currentNode.children[i]);
      }

      // step 4
      callback(currentNode);

      // step 1
    })(this._root);

  };



  Tree.prototype.contains = function(callback, traversal) {
    traversal.call(this, callback);
  };

  Tree.prototype.add = function(data, toData, traversal) {
    var child = new Node(data),
      parent = null,
      callback = function(node) {
        if (node.data === toData) {
          parent = node;
        }
      };

    this.contains(callback, traversal);

    if (parent) {
      parent.children.push(child);
      child.parent = parent;
    } else {
      throw new Error('Cannot add node to a non-existent parent.');
    }
  };

  Tree.prototype.changeParent = function(data, newParentData, traversal) {
    var targetNode = null,
    	oldParent = null,
      callback = function(node) {
        if (node.data === data) {
          oldParent = node.parent;
          targetNode = node;
        }
      };

    this.contains(callback, traversal);

    if (oldParent) {
      index = findIndex(oldParent.children, data);

      if (index === undefined) {
        throw new Error('Node to change parents of does not exist.');
      } else {
        nodeToChangeParentOf = oldParent.children.splice(index, 1);

        var newParent = null,
          newParentCallback = function(node) {
            if (node.data === newParentData) {
              newParent = node;
            }
          };

        this.contains(newParentCallback, traversal);

        if (newParent) {
        	newParent.children.push(targetNode);
          targetNode.parent = newParent;
          //alert(newParent.children[0].data);
        } else {
          throw new Error('New Parent Does not exist!');
        }


      }


    } else {
      throw new Error('The node did not have any previous parent!');
    }

  };





  Tree.prototype.remove = function(data, fromData, traversal) {
    var tree = this,
      parent = null,
      childToRemove = null,
      index;

    var callback = function(node) {
      if (node.data === fromData) {
        parent = node;
      }
    };

    this.contains(callback, traversal);

    if (parent) {
      index = findIndex(parent.children, data);

      if (index === undefined) {
        throw new Error('Node to remove does not exist.');
      } else {
        childToRemove = parent.children.splice(index, 1);
      }
    } else {
      throw new Error('Parent does not exist.');
    }

    return childToRemove;
  };

  function findIndex(arr, data) {
    var index;

    for (var i = 0; i < arr.length; i++) {
      if (arr[i].data === data) {
        index = i;
      }
    }

    return index;
  }
  //tree implementation ends




  //create parent workflow
  var workflow = new Tree("workflow");
  //workflow.add("node1", "workflow", workflow.traverseDF);
  //workflow.add("node2", "node1", workflow.traverseDF);
  //workflow.add("node3", "node1", workflow.traverseDF);
  //workflow.add("node4", "node1", workflow.traverseDF);

  //workflow.add("node5", "node4", workflow.traverseDF);
  //workflow.add("node6", "node4", workflow.traverseDF);
  //workflow.add("node7", "node4", workflow.traverseDF);

  //workflow.remove("node2", "node1", workflow.traverseDF);

  //workflow.add("node2", "node3", workflow.traverseDF);
	//workflow.changeParent("node2", "node3", workflow.traverseDF);
/*
	var all_nodes = [];
  workflow.traverseDF(function(node) {

    all_nodes.push(node);
  });

  all_nodes.reverse();





  var tree_nodes = [];

  for(var i=0; i<all_nodes.length; i++){


    var aNode = null;

    if(all_nodes[i].parent){
      aNode = {
        "parent": getParentJSON(all_nodes[i].parent.data, tree_nodes),
        "text" : {
          "name": all_nodes[i].data
        }
      }
    }else{
      aNode = {
        "text" : {
          "name": all_nodes[i].data
        }
      }
    }

    tree_nodes.push(aNode);




  }





 config = {
    container: "#tree-simple",
    node: {
        collapsable: true
    },
    connectors:{
        type: "bCurve"
    },
    padding: 0
};


  tree_nodes.push(config);


var my_chart = new Treant(tree_nodes);
*/

  function getParentJSON(parentNodeData, tree_nodes){
    for(var i=0; i< tree_nodes.length; i++){
      if(tree_nodes[i].text.name == parentNodeData)return tree_nodes[i];
    }

    return null;
  }


function redrawWorkflowStructure(){
    	var all_nodes = [];
  workflow.traverseDF(function(node) {

    all_nodes.push(node);
  });

  all_nodes.reverse();





  var tree_nodes = [];

  for(var i=0; i<all_nodes.length; i++){


    var aNode = null;

    if(all_nodes[i].parent){
      aNode = {
        "parent": getParentJSON(all_nodes[i].parent.data, tree_nodes),
        "text" : {
          "name": all_nodes[i].data
        }
      }
    }else{
      aNode = {
        "text" : {
          "name": all_nodes[i].data
        }
      }
    }

    tree_nodes.push(aNode);




  }



   config = {
    container: "#tree-simple",
    node: {
        collapsable: true
    },
    connectors:{
        type: "bCurve"
    },
    padding: 0
};


  tree_nodes.push(config);


new Treant(tree_nodes);

}






//source code in pre tag... toggle show/hides
$(".code_show_hide").live('click', function () {
    $(this).siblings('.pre_highlighted_code').children(".highlighted_code").toggle(1000);
});

$(".documentation_show_hide").live('click', function () {
    $(this).siblings('.documentation').toggle(300);
});

$(".settings_show_hide").live('click', function () {
    $(this).siblings('.settings').toggle(300);
});

$(".btn_edit_code").live('click',function () {
    $(this).siblings('.edit_code').toggle(1000);
});

$(".setting_param").live('change',function () {
    //alert("you changed my value");
    //var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
    //alert(prev_code);
    //$(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());
    $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val('');
    $(this).siblings(".setting_param").each(function () {
        //alert($(this).val());
        var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
        $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());
    });
    var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
    $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());



    //get module id and param information for change in the remote clients
    //var myPar = $(this).closest(".module");
    //alert(myPar.attr('id'));
    //alert($(this).index("#" + myPar.attr('id') + "  .setting_param"));

    //inform of this change to all the other clients...

});









//adds the module to the pipeline. moduleID is unique throughout the whole pipeline
//moduleName is the name of the module like: rgb2gray, medianFilter and so on
function addModuleToPipeline(moduleID, moduleName){

        var module_name = ''
        var documentation = ''
        var moduleSourceCode_settings = ''
        var moduleSourceCode_main = ''
        var moduleSourceCode_html = ''

        $.ajax({
            type: "POST",
            cache: false,
            url: "/get_module_details",
            data: 'p_module_key=' + moduleName,
            success: function (option) {

                module_name = option.module_name
                documentation = option.documentation
                moduleSourceCode_settings = option.moduleSourceCode_settings
                moduleSourceCode_main = option.moduleSourceCode_main
                moduleSourceCode_html = option.moduleSourceCode_html
                user_role = option.user_role

                user_role_based_edit = ''
                if (user_role == 'image_researcher') {
                    user_role_based_edit = '| <a style="font-size:12px;color:#000000;" href="#" class="btn_edit_code"> Edit </a> | <a style="font-size:12px;color:#000000;" href="#" > Contact Author </a>';
                }




                //append new module to the pipeline...
                $("#img_processing_screen").append(
                    '<div style="background-color:#EEE;width:100%" class="module" id="module_id_'+ moduleID +'">' +

                '<!-- Documentation -->' +
                '<div style="margin:10px;font-size:17px;color:#000000;">' +
                  ' ' + module_name + '<hr/>' +
                   ' Documentation: <a style="font-size:12px;color:#000000;" href="#" class="documentation_show_hide">(Show/Hide)</a>' +
                    '<div class="documentation" style="background-color:#888888;display:none;font-size:14px;">' + documentation + '</div>' +
                '</div>' +


                '<!-- Settings -->' +
                '<div style="margin:10px;font-size:17px;color:#000000;">' +
                 '   Settings: <a style="font-size:12px;color:#000000;" href="#" class="settings_show_hide">(Show/Hide)</a>' +
                 '   <div class="settings" style="background-color:#888888;display:none;font-size:14px;">' + moduleSourceCode_html + '</div>' +
                '</div>' +


                '<div style="margin:10px;font-size:17px;color:#000000;" class="setting_section">' +
                '    Source Code: <a style="font-size:12px;color:#000000;" href="#" class="code_show_hide">(Show/Hide)</a>' + user_role_based_edit +

                 '   <div class="edit_code" style="background-color:#888888;display:none;font-size:14px;">' +
                  '          <textarea rows=7 cols=180 class="code_settings">' + moduleSourceCode_settings + '</textarea>' +
                   '         <p style="color:#000000;">Main Implementation: </p>' +
                    '        <textarea rows=10 cols=180>' + moduleSourceCode_main + '</textarea>' +
                    '</div>' +

                   ' <pre style="background-color:#333333;width:100%;" class="pre_highlighted_code">' + '<code class="python highlighted_code" style="display:none;">' + moduleSourceCode_settings +
                   ' ' +
                moduleSourceCode_main + '</code></pre>' +

               ' </div>' +

                '</div>'


            );//end of append

            //if(isItMyFloor() == false)lockParamsSettings();

                $('pre code').each(function (i, block) {
                    hljs.highlightBlock(block);
                });


            },
            error: function (xhr, status, error) {
                alert(xhr.responseText);
            }

        });//end of ajax


}




function getNextUniqueModuleID(){

    return unique_module_id;
}

function updateNextUniqueModuleID(){
    unique_module_id = unique_module_id + 1;
}





    //bio test starts
$("#design_pipelines_menu_biodatacleaning_id").click(function () {

    //allowed iff the user has the floor currently...
    //if(isItMyFloor() == true){
        var newModuleID = getNextUniqueModuleID();
        var newModuleName = 'biodatacleaning';
        addModuleToPipeline(newModuleID, newModuleName);

        //prepare the next valid unique module id
        updateNextUniqueModuleID();

        workflow.add("Module_"+newModuleID + " (" + newModuleName +")", "workflow", workflow.traverseDF);

        redrawWorkflowStructure();

        //add the module to all remote clients as well...
        //var moduleInfo = {"newModuleID": newModuleID, "newModuleName": newModuleName};
        //notifyAll("remote_module_addition", moduleInfo);
    //}

});







//========================================================
//============= WORKFLOW CONTROL CODE ENDS ===============
//========================================================





















});
