import urllib2
from bs4 import BeautifulSoup

genre_url = "http://everynoise.com/everynoise1d.cgi?scope=all";
html = urllib2.urlopen(genre_url);

html_soup = BeautifulSoup(html, "html.parser");

#need a flag as there are 2 "note" td's for every genre, the first of each is empty
flg = False;

#str will end as "|" delimited file
genre_list_str = "";

for genre_tag in html_soup.find_all("td", class_ = "note"):
    if(flg):
        genre_list_str += genre_tag.find_all("a")[0].contents[0] + "|";
    flg = not flg;

#remove final "|"
genre_list_str = genre_list_str[:-1];

file = open("genre_list.txt", "w");
file.write(genre_list_str);
file.close();