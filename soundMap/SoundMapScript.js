// 1. func defs
var soundMap;
var mapLayer;
var radioName;
var radioValue;
var filteredGeoJson;
var CSV = 'soundMap/streetSounds.csv';


var filterCollection = {
    time: null,
    recordingLocation: null,
    locationType: null
};

var filteredSoundData = null;

var filterData = function (filterCollection) {

    if (filterCollection.time === null &&
      filterCollection.recordingLocation === null &&
      filterCollection.locationType === null) {

        filteredSoundData = null;
        return;
    };

    filteredSoundData = soundData.features.filter(function (aFeature) {

        var keepFeature,
            interior = true,
            time = true,
            type = true;

        if (filterCollection.recordingLocation !== null) {
            if (parseInt(aFeature.properties.recordingTypeIndex) !== parseInt(filterCollection.recordingLocation)) {
                interior = false;
            }
        }

        if (filterCollection.time !== null) {
            if (parseInt(aFeature.properties[filterCollection.time]) !== 1) {
                time = false;
            } else {
                console.log("time hit");
            }
        }

        if (filterCollection.locationType !== null) {
            if (aFeature.properties.loctionType !== filterCollection.locationType) {
                type = false;
            }
        }

        keepFeature = interior && time && type;

        return keepFeature;

    });

    filteredGeoJson = {

        "type": "FeatureCollection",
        "features": filteredSoundData

    };

};

function reloadNewSoundPlot() {
    // Delete all data and reload from new source
    // d3.select("#NetworkData").remove();
    document.getElementById("soundPlot").innerHTML = "";
    createParralelCoord();
}

var updateMap = function (geoJsonObject) {
    soundMap.remove();
    //soundMap.removeLayer(mapLayer);

    addDataToMap(geoJsonObject);

};

var resetMap = function () {
    soundMap.remove();

    addAMap();
};

var onRadioClick = function (aRadio) {
    radioName = aRadio.name;
    radioValue = aRadio.value;
    onRadioChange();
};

var resetModel = function () {
    filterCollection.time = null,
    filterCollection.recordingLocation = null,
    filterCollection.locationType = null,
    CSV = "soundMap/streetSounds.csv",

    resetMap();
    reloadNewSoundPlot();

    var ele = document.getElementsByName("time");
    for (var i = 0; i < ele.length; i++)
        ele[i].checked = false;

    var ele = document.getElementsByName("recordingLocation");
    for (var i = 0; i < ele.length; i++)
        ele[i].checked = false;

    var ele = document.getElementsByName("locationType");
    for (var i = 0; i < ele.length; i++)
        ele[i].checked = false;
}

var onRadioChange = function () {
    // Update the model
    filterCollection[radioName] = radioValue;

    // Filter Data
    filterData(filterCollection);

    // Update Map
    updateMap(filteredGeoJson);

    if (filterCollection.recordingLocation !== null) {
        if (parseInt(filterCollection.recordingLocation) !== 1) {
            CSV = "soundMap/interiorSounds.csv";
        } else {
            CSV = "soundMap/streetSounds.csv";
        }
        reloadNewSoundPlot();
    }

};


var addDataToMap = function (geoJsonObject) {

    soundMap = L.map("mapContainer");
    soundMap.setView([40.7940, -77.8580], 15);

    mapLayer = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2F2ZWx5ZXYiLCJhIjoiY2llaXRkaWppMDBvYnN4bTNvY3pxbjdueSJ9.qo0YZw0ehlDadtro20aHyQ", {
        maxZoom: 22,
        id: "mapbox.dark"
    });

    mapLayer.addTo(soundMap);


    // add markers 

    var soundLoc, listIndex, locat, locLat, locLon, marker, loudness, name, locStyling;

    soundLoc = geoJsonObject.features;
    listIndex = 0;




    while (listIndex < soundLoc.length) {

        locat = soundLoc[listIndex];

        locLat = locat.geometry.coordinates[1];
        locLon = locat.geometry.coordinates[0];

        name = locat.properties.name;

        var locationIconOps = L.Icon.extend({
            options: {
                iconSize: [30, 30]
            }
        });

        var loudnessIcon;

        if (filterCollection.time === null) {
            loudnessIcon = "5";
        } else {
            loudnessIcon = locat.properties["loudness_" + filterCollection.time];
        }



        var urlString = 'soundMap/symbols/' +
                          locat.properties.recordingTypeIndex +
                          '' +
                          locat.properties.locationTypeIndex +
                          '' +
                          //loudnessIcon + 
                          (filterCollection.time ? locat.properties["loudness_" + filterCollection.time] : "5") +
                          '.png',
        locationIcon = new locationIconOps({ iconUrl: urlString });


        marker = L.marker([locLat, locLon], { icon: locationIcon });

        marker.addTo(soundMap);

        marker.on("click", respondToClick, locat);

        var tooltip = L.tooltip({
            target: marker,
            map: soundMap,
            html: '' + name + ''
        });



        listIndex = listIndex + 1;

    }
};



var createParralelCoord = function () {

    // quantitative color scale
    var blue_to_brown = d3.scale.linear()
      .domain([2, 11])
      .range(["red", "green"])
      .interpolate(d3.interpolateLab);

    var color = function (d) { return blue_to_brown(d['Time']); };

    var parcoords = d3.parcoords()("#soundPlot")
      .color(color)
      .alpha(0.4);

    // load csv file and create the chart
    d3.csv(CSV, function (data) {
        parcoords
          .data(data)
//                    .hideAxis(["Time"])
          .composite("darker")
          .render()
          .shadows()
          .reorderable()
          .brushMode("1D-axes");  // enable brushing
    });

    var sltBrushMode = d3.select('#sltBrushMode')

    sltBrushMode.selectAll('option')
      .data(parcoords.brushModes())
      .enter()
        .append('option')
        .text(function (d) { return d; });

    sltBrushMode.on('change', function () {
        parcoords.brushMode(this.value);
        switch (this.value) {
            case 'None':
                d3.select("#pStrums").style("visibility", "hidden");
                d3.select("#lblPredicate").style("visibility", "hidden");
                d3.select("#sltPredicate").style("visibility", "hidden");
                d3.select("#btnReset").style("visibility", "hidden");
                break;
            case '2D-strums':
                d3.select("#pStrums").style("visibility", "visible");
                break;
            default:
                d3.select("#pStrums").style("visibility", "hidden");
                d3.select("#lblPredicate").style("visibility", "visible");
                d3.select("#sltPredicate").style("visibility", "visible");
                d3.select("#btnReset").style("visibility", "visible");
                break;
        }
    });

    sltBrushMode.property('value', '1D-axes');

    d3.select('#btnReset').on('click', function () { parcoords.brushReset(); })
    d3.select('#sltPredicate').on('change', function () {
        parcoords.brushPredicate(this.value);
    });

};

var respondToClick = function () {

    document.getElementById("A").textContent = "";

    var locat = this;

    var soundType = locat.properties.streetPlaylist;

    document.getElementById("embedPlayer").src = "//embeds.audioboom.com/publishing/playlist/v4?bg_fill_col=%23ecefef&amp;boo_content_type=playlist&amp;data_for_content_type=" + soundType + "&amp;image_option=small&amp;link_color=%2358d1eb&amp;player_theme=light&amp;src=https%3A%2F%2Fapi.audioboom.com%2Fplaylists%2F" + soundType + "";

};

var addAMap = function () {



    soundMap = L.map("mapContainer");
    soundMap.setView([40.7940, -77.8580], 15);



    mapLayer = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2F2ZWx5ZXYiLCJhIjoiY2llaXRkaWppMDBvYnN4bTNvY3pxbjdueSJ9.qo0YZw0ehlDadtro20aHyQ", {
        maxZoom: 22,
        id: "mapbox.dark"
    });

    mapLayer.addTo(soundMap);


    // add markers 

    var soundLoc, listIndex, locat, locLat, locLon, marker, loudness, name, locStyling;

    soundLoc = soundData.features;
    listIndex = 0;

    while (listIndex < soundLoc.length) {

        locat = soundLoc[listIndex];

        locLat = locat.geometry.coordinates[1];
        locLon = locat.geometry.coordinates[0];

        loudness = locat.properties.loudness;
        name = locat.properties.name;


        locStyling = {
            stroke: false,
            fillOpacity: 1,
            radius: loudness
        };

        var locationIconOps = L.Icon.extend({
            options: {
                iconSize: [30, 30]
            }
        });

        var locationIcon = new locationIconOps({ iconUrl: 'soundMap/symbols/' + locat.properties.recordingTypeIndex + '' + locat.properties.locationTypeIndex + '5.png' });




        marker = L.marker([locLat, locLon], { icon: locationIcon });

        marker.addTo(soundMap);

        marker.on("click", respondToClick, locat);

        var tooltip = L.tooltip({
            target: marker,
            map: soundMap,
            html: '' + name + ''
        });

        listIndex = listIndex + 1;

    }
};


// 2. init def

var init = function () {

    // add a map
    addAMap();

    // add pcp
    createParralelCoord();

};



// 3. telling when to run init

window.onload = init;