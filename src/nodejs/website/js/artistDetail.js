document.getElementById("followersChart").style.display = "none";
document.getElementById("popularityChart").style.display = "none";
function showGraph(evt, graph) {

    var perfGraphs = document.getElementsByClassName("perfTab");
    for (i = 0; i < perfGraphs.length; i++) {
        perfGraphs[i].style.display = "none";
    }

    var tablinks = document.getElementsByClassName("tablinks");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(graph).style.display = "block";
    evt.currentTarget.className += " active";
}
