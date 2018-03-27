var prevBtn = document.getElementById("prevPage");
var nextBtn = document.getElementById("nextPage");

prevBtn.addEventListener("click", function(){
    prevBtn.setAttribute("value", pageNumber);    
});
