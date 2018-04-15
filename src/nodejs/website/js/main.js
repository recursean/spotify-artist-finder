//document.getElementById("lowVal").setAttribute("value", (document.getElementById.textContent == "1" ? "1" : +document.getElementById("low").textContent - 25));
//document.getElementById("highVal").setAttribute("value", (+document.getElementById("high").textContent + 1));

function setURL(nextFlag){
    var url = '/?';
    if(nextFlag)
        url += 'start=' + (+document.getElementById("high").textContent + 1);
    else
        url += 'start=' + (document.getElementById.textContent == "1" ? "1" : +document.getElementById("low").textContent - 25);

    var filtersForm = document.getElementById("filters");
    for(var i = 0; i < filtersForm.elements.length; i++){
        if(filtersForm.elements[i].type == "checkbox" && filtersForm.elements[i].checked){
            if(i < 6)
                url += "&genre=" + filtersForm.elements[i].value;
            else
                url += "&label=" + filtersForm.elements[i].value;
        }
    }   
    window.location.href = url;
}

document.getElementById("prevBtn").onclick = function(){
    setURL(false);
};

document.getElementById("nextBtn").onclick = function(){
    setURL(true);
};
