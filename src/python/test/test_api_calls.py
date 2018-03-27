import requests
import base64
import pymysql
from time import sleep

def crawler_container():
    client_id = 'e52dbfc794b8418196e713adf5e8c604';
    client_secret = '8d0210843c7a44208bc8b9d40517b5c0';

    access_token = get_access_token(client_id, client_secret);    

    run_api_test(access_token);

def get_access_token(client_id, client_secret):
    payload = {'grant_type':'client_credentials'};
    headers = {'Authorization':'Basic ' + (base64.b64encode(bytes(client_id + ':' + client_secret))).decode('ascii')};

    res = requests.post('https://accounts.spotify.com/api/token', headers = headers, data = payload);

    if res.status_code == 200:
        return res.json()['access_token'];        
    else:
        print('Error in request to get access token');

def run_api_test(access_token):
    headers = {'Authorization':'Bearer ' + access_token}
    res = requests.get("https://api.spotify.com/v1/artists/2L2lkQg4DULiCLix5UXUN3/albums",
           headers = headers);
    if res.status_code != 200:
        print(res);
    else:
        print(res.json());
        #for artist in res.json()['artists']['items']:
         #   print(artist['name']);

if __name__ == '__main__':
    crawler_container();
