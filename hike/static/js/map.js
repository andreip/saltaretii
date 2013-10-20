var map, routeInput=false, placeListener;
var currRoutePoints = [], iCanHazAPoly, markers = [];
var elevator, chart;
var infowindow = new google.maps.InfoWindow();
elevator = new google.maps.ElevationService();
var currDist = 0;

google.maps.event.addDomListener(window, 'load', initialize);
google.load('visualization', '1', {packages: ['columnchart']});
// Button bindings
$('#addRoute').on('click', enableRouteInput);
$('#saveRoute').on('click', submitRoute);
$('#undoPoint').on('click', undoPlaceMarker);

// Functions for button bindings
function enableRouteInput(event) {
     if (routeInput == true)
         return;

     routeInput = true;
     $("#routeInputPanel").show();
     placeListener = google.maps.event.addListener(map, 'click', function(event) {
         placeMarker(event.latLng);
         currRoutePoints.push([event.latLng.lat(), event.latLng.lng()]);
         drawRoute(currRoutePoints, false);
         
         var x = currRoutePoints.pop();
         var y = currRoutePoints.pop();

         if (y) {
             addDistance(new google.maps.LatLng(x[0], x[1]), new google.maps.LatLng(y[0], y[1]));
             currRoutePoints.push(y);
             console.log("dist " + currDist);
         }
         currRoutePoints.push(x);
     });
}

function addDistance(a, b) {
    currDist += google.maps.geometry.spherical.computeDistanceBetween(a, b);
}

function subDistance(a, b) {
    currDist -= google.maps.geometry.spherical.computeDistanceBetween(a, b);
}

function undoPlaceMarker() {
     var x = currRoutePoints.pop();
     var y = currRoutePoints.pop();

     if (y) {
         subDistance(new google.maps.LatLng(x[0], x[1]), new google.maps.LatLng(y[0], y[1]));
         currRoutePoints.push(y);
         console.log("dist " + currDist);
     }
     drawRoute(currRoutePoints, false);

}

function submitRoute() {
     if (routeInput == false)
         return;

     newRoute = new RouteObject($("#start").val(), $("#stop").val(), currRoutePoints);

     if (checkRouteSanity(newRoute) == false) {
         console.log("iese");
         return;

     }

     placeListener.remove();
     saveRoutes(newRoute);
     if (newRoute && newRoute.points !== undefined) {
        drawRoute(newRoute.points);
    }

     // Clean the current route
     currRoutePoints = [];
     currDist = 0;
     routeInput = false;
     $("#routeInputPanel").hide();

}

function checkRouteSanity(RouteObject) {
     if (RouteObject.start == "") {
         alert("Enter the name of the starting point!");
         return false;
     }

     if (RouteObject.stop == "") {
         alert("Enter the name of the final point!");
         return false;
     }

     if (RouteObject.points.length < 2) {
         alert("Invalid route!");
         return false;
     }

     return true;
}

function RouteObject(start, stop, points) {
     this.start = start;
     this.stop =  stop;
     this.points = currRoutePoints;
     this.dist = currDist;
}

function placeMarker(location) {
    var marker = new google.maps.Marker({
         position: location,
         map: map
         });

    markers.push(marker);
}

function clearMap() {
    for (var i = 0; i < markers.length; ++i)
        markers[i].setMap(null);

    markers = [];
    currDist = 0;

    if (iCanHazAPoly)
        iCanHazAPoly.setMap(null);
}

function getCoords(points) {
    cords = [];
    for (var i = 0; i < points.length; ++i) {
        cords.push(new google.maps.LatLng(points[i][0], points[i][1]));
    }
    return cords;
}

function drawElevation(points) {
    chart = new google.visualization.ColumnChart(document.getElementById('elevation_chart'));
    var elevPath = [];
    elevPath = getCoords(points);
    var routeReq = {
        'path': elevPath,
        'samples': 256
    };
    elevator.getElevationAlongPath(routeReq, plotElevation);
}

function plotElevation(results, status) {
  if (status != google.maps.ElevationStatus.OK) {
    return;
  }
  var elevations = results;

  var elevationPath = [];
  for (var i = 0; i < results.length; i++) {
    elevationPath.push(elevations[i].location);
  }

  // Display a polyline of the elevation path.
  var pathOptions = {
    path: elevationPath,
    strokeColor: '#0000CC',
    opacity: 0.4,
    map: map
  }
  var data = new google.visualization.DataTable();
  data.addColumn('string', 'Sample');
  data.addColumn('number', 'Elevation');
  var min = elevations[0].elevation;
  var max = elevations[0].elevation;
  for (var i = 0; i < results.length; i++) {
    data.addRow(['', elevations[i].elevation]);
    if(min > elevations[i].elevation) {
		min = elevations[i].elevation;
	}
	if(max < elevations[i].elevation) {
		max = elevations[i].elevation;
	}
  }
  console.log(max-min);
   // Draw the chart using the data within its DIV.
  document.getElementById('elevation_chart').style.display = 'block';
  chart.draw(data, {
    height: 150,
    legend: 'none',
    titleY: 'Elevation (m)'
  });
}
  
//------------------------------------------------------------------//

function drawRoute(points, center) {
    if (points === undefined) {
        console.log("Houston, we have a problem...");
        return;
    }

    var routeCoords = [];


    routeCoords = getCoords(points);
    clearMap();

    placeMarker(routeCoords[0]);
    placeMarker(routeCoords[routeCoords.length - 1]);

    iCanHazAPoly = new google.maps.Polyline({
       path: routeCoords,
       geodesic: true,
       strokeColor: '#FF0000',
       strokeOpacity: 0.6,
       strokeWeight: 1.5
    });

    iCanHazAPoly.setMap(map);

    if (center === true)
        map.setCenter(routeCoords[0]);
}

function clearRoute() {
    setAllMap(map);
}

// Main function if this was C
function initialize() {
    var mapOptions = {
        zoom: 18,
        center: new google.maps.LatLng(45.7291, 24.7019),
        mapTypeControlOptions: {
             mapTypeIds: [google.maps.MapTypeId.TERRAIN,
                          google.maps.MapTypeId.ROADMAP,
                          google.maps.MapTypeId.SATELLITE,
                          google.maps.MapTypeId.HYBRID],
             style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        mapTypeId: google.maps.MapTypeId.TERRAIN
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            initialLocation = new google.maps.LatLng(position.coords.latitude,
                                                     position.coords.longitude);
            map.setCenter(initialLocation);
        });
    }

    map = new google.maps.Map(document.getElementById('map-canvas'),
          mapOptions);

    drawElements();
}

function drawElements() {
    // Do GET api call and fetch routes.
    drawRouteMenuItems();
}

function drawRouteMenuItems() {
    $list = $('.menu-routes .routes-list');
    $.get('api/routes/', function(data) {
        for (var i = 0; i < data.objects.length; ++i) {
            route = data.objects[i];
            route_item = '<li><a href="#" class="route-item" data-points="' + route.points + '">' + route.start + " - " + route.stop +  " - " + '</a></li>';
            $list.append(route_item);
        }
        $('.route-item').click(clickRouteItem);
    });

}

/* When you click on a route from right menu, you get it displayed. */
function clickRouteItem(event) {
    event.preventDefault();
    drawRoute($(event.currentTarget).data("points"), true);
    drawElevation($(event.currentTarget).data("points"));
    computeDist($(event.currentTarget).data("points"));
}

// Dirty function MUST BE REMOVED
function computeDist(points) {
    for (var i = 1; i < points.length; ++i) {
       var x = new google.maps.LatLng(points[i - 1][0], points[i - 1][1]);
       var y = new google.maps.LatLng(points[i][0], points[i][1]);

       addDistance(x, y);
    }
    console.log(currDist);
}

function saveRoutes(routes) {
    $.ajax({
        type: 'POST',
        url: 'api/routes/',
        data: JSON.stringify(newRoute),
        dataType: "application/json",
        processData:  false,
        contentType: "application/json"
    });
}
