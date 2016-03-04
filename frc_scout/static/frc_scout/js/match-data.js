/*global h337*/
/*global Springy*/

var can, ctx;
var heatmap;
$(function(){
    $("#tree").springy({graph:graph})
    var bleh = $("#heatmap_image");
    var ape = $("<div></div>").
    offset({
        top:bleh.offset().top,
        left:bleh.offset().left
    }).
    width(bleh.width()).
    height(bleh.height()).
    prop("id","ape").
    css("z-index", "100").
    appendTo("body");
    var config = {
        container: document.getElementById('ape'),
        radius: 40,
        maxOpacity: .5,
        minOpacity: 0,
        blur: .75
    };
    heatmap = h337.create(config);
    ape.css("position","absolute");
    
});
function clear(){
    ctx.clearRect (0, 0, can.width, can.height);
}
 function drawLine(x, y, stopX, stopY){
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(stopX, stopY);
    ctx.closePath();
    ctx.stroke();
}

var graph = new Springy.Graph();
    
var events = [
    "LowGoal",
    "HighGoal",
    "Crossing",
    "PickupBall",
    "BlockedShot",
    "BlockedCrossing"
];

// create heatmap with configuration

function drawEventMap(data){
    for (var i = 0; i < data.length-1; i++){
        var pos = toPix(data[i],can);
        var posP = toPix(data[i+1], can);
        drawLine(pos.x,pos.y,posP.x,posP.y);
        ctx.fillText(events[data[i].evType] + "; " + i, data[i].x,data[i].y);
    }
    var pp = toPix(data.length-1, can);
    ctx.fillText(events[data[data.length-1].evType] + "; " + i, pp.x,pp.y);
    
}
function drawMatchMap(match_id){
    getEventDataForMatch({
        match:match_id,
        order:["time"],
        columns:["evType", "x", "y", "time"]
    }, drawEventMap);
}

function heatmapMap(data){
    heatmap.setData({min:0,max:1,data:[]});
    
    for(var point of data){
        var image = $("#heatmap_image");
        heatmap.addData(toPixels(point, image));
    }
}
function toPix(obj,image){
    var xPosition = obj.x * image.width();
    var yPosition = obj.y * image.height();
    return {x:xPosition,y:yPosition};
}
function toPixels(obj, img){
    var image = $(img);
    var xPosition = obj.x * image.width();
    var yPosition = obj.y * image.height();
    return {x:xPosition,y:yPosition,value:1};
}

function getEventDataForTeam(options, callback){
    $(".team-number").text("" + options.team);
    postRequest('/dev/team_event/', options,callback);
}
function getMatchDataForTeam(options, callback){
    $(".team-number").text("" + options.team);
    postRequest('/dev/team_match/',options,callback);
}
function postRequest(url, data, callback){
    $.ajax({
        url: url,
        method: "POST",
        data: {
            csrfmiddlewaretoken: $.cookie('csrftoken'),
            data: JSON.stringify(data)
        },
        success:function(data,blah,bleh){
            if(data)
                callback(data);
        }
    });
}
function getEventDataForMatch(options, callback){
    $(".team-number").text("" + options.team);
    postRequest('/dev/match_event_data/',options,callback);
}
function displayHeatmap(team,evType){
    getEventDataForTeam({
        team:team,
        filter:{
            evType:evType
        },
        columns:["x","y"]
    }, heatmapMap);
}
function getCounts(team, callback){
    postRequest("/results/counts/", {
        team:team
    }, callback);
}
function createEventTree(team){
    getEventDataForTeam({
        team:team,
        order:["match_id","time"],
        columns:["time","match_id","evType"]
    }, createTree);
}
function createTree(data){
    var currentMatch = data[0].match_id;
    var root = graph.newNode({label:"root"});
    root.children = [];
    var lastElement = root;
    for(var event of data){
        if(event.match_id!=currentMatch){
            lastElement=root;
            currentMatch=event.match_id;
        }
        var eventName = events[parseInt(event.evType)];
        var exists = false;
        for(var child of lastElement.children){
            if(child.data.label.startsWith(eventName)){
                child.data.label += "(+1)";
                exists = true;
                lastElement = child;
                break;
            }
        }
        if(!exists){
            var newEvent = graph.newNode({label:eventName});
            lastElement.children.push(newEvent);
            newEvent.children = [];
            graph.newEdge(lastElement, newEvent);
            lastElement = newEvent;
        }
    }
}
var defenses = ["Portcullis","Moat","Drawbridge","Rough Terrain","Rock Wall","Ramparts","Sally Port","Cheval de Frise"];
function prepareData(data){
    var bleh = [];
    for(var k of data){
        bleh.push([parseInt(k)]);
    }
    return bleh;
}
function createDefenseGraph(data){
    $('#defense_chart').height(400).tufteBar({
    data: prepareData(data),

    barWidth: 0.8, 

    // The label on top of the bar - can contain HTML
    // formatNumber inserts commas as thousands separators in a number
    barLabel:  function(index) { 
      return $.tufteBar.formatNumber(this[0])
    }, 

    // The label on the x-axis - can contain HTML
    axisLabel: function(index) { return defenses[index]}, 

    // The color of the bar
    color:     function(index) { 
      return ['#E57536', '#82293B'][index % 2] 
    },

    // Stacked graphs also pass a stackedIndex parameter
    color:     function(index, stackedIndex) { 
      return ['#E57536', '#82293B'][stackedIndex % 2] 
    },

    // Alternatively, you can just override the default colors and keep
    // the built in color functions
    colors: ['#82293B', '#E57536', '#FFBE33'],
  });
}
var currentTeam
$("#teamSelectButton").click(function(){
    currentTeam= parseInt($("#teamSelector").val());
    createGraph(currentTeam);
    createEventTree(currentTeam);
    displayPitData(currentTeam);
    $("#EventSelect").show();
});
$("#EventSelect").on("change",function(thing){
    var ayy = parseInt($(this).val());
    if(ayy==-1) return;
    displayHeatmap(currentTeam,ayy);
});
function createGraph(team){
    getCounts(team,createDefenseGraph);
}
function getPitData(team){
    postRequest("/dev/team_pit/",{
        team:team,
        this_location:true
    }, displayPitData);
}
function displayPitData(data){
    $("#pit").text(JSON.stringify(data[0],null,2));
}