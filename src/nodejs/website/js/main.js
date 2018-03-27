document.getElementById("lowVal").setAttribute("value", (document.getElementById.textContent == "1" ? "1" : +document.getElementById("low").textContent - 25));
document.getElementById("highVal").setAttribute("value", (+document.getElementById("high").textContent + 1));

//document.getElementById("prevPage").setAttribute("action", "/?start=" + document.getElementById("low").textContent);
//document.getElementById("nextPage").setAttribute("action", "/?start=" + document.getElementById("high").textContent);
