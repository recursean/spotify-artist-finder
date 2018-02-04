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
    res = requests.get('https://api.spotify.com/v1/search?q=year%3A2017%20genre:%22pop%22&type=artist&offset=20&market=US', 
            headers = headers);
    if res.status_code != 200:
        print(res.status_code + ' Error in getting related artists');
    else:
        print(res.json());

if __name__ == '__main__':
    crawler_container();
