import { Component, OnInit } from '@angular/core';
import { Renderer2, ElementRef } from "@angular/core";
import { Platform } from "@ionic/angular";

declare let cordova: any;
declare let $: any;

@Component({
  selector: 'app-record',
  templateUrl: './record.page.html',
  styleUrls: ['./record.page.scss'],
})
export class RecordPage implements OnInit {

  ua: apiRTC.UserAgent = null;
  connectedSession: apiRTC.Session = null;
  connectedConversation = null;
  // currentCall: apiRTC.Call = null;
  localStream: apiRTC.Stream = null;
  conferenceName: string;

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    public platform: Platform) {

      this.platform.ready().then(() => {
        if (this.platform.is('ios')) {
            cordova.plugins.iosrtc.registerGlobals();
        }
        const script = this.renderer.createElement("script");
        script.src = "https://cloud.apizee.com/apiRTC/apiRTC-latest.min.js";
        script.onload = () => {
            console.log("apiRTC loaded");
            // this.startApp();
        };
        this.renderer.appendChild(this.elementRef.nativeElement, script);
    });

    }

  ngOnInit() {
  }


  joinConference(name) {

    console.log("startApp");

    apiRTC.setLogLevel(10);

    this.ua = new apiRTC.UserAgent({
        uri: "apzkey:bff17007a02b12c025350eace38cf7fc",
    });

    let registerInformation = {
        cloudUrl: "https://cloud.apizee.com",
    };

    this.ua
    .register(registerInformation)
    .then((session) => {
        console.log("User registered with session: ", session);
        this.connectedSession = session;

        this.connectedSession
        .on("contactListUpdate", (updatedContacts) => { //display a list of connected users
            console.log("MAIN - contactListUpdate", updatedContacts);
            if (this.connectedConversation !== null) {
                let contactList = this.connectedConversation.getContacts();
                console.info("contactList  connectedConversation.getContacts() :", contactList);
            }
        });

        //==============================
            // 3/ CREATE CONVERSATION
            //==============================

            this.connectedConversation = this.connectedSession.getConversation(name);

            //==========================================================
            // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
            //==========================================================

            this.connectedConversation.on('streamListChanged', (streamInfo) => {

                console.log("streamListChanged :", streamInfo);

                if (streamInfo.listEventType === 'added') {
                    if (streamInfo.isRemote === true) {

                        this.connectedConversation.subscribeToMedia(streamInfo.streamId)
                            .then(function (stream) {
                                console.log('subscribeToMedia success');
                            }).catch(function (err) {
                            console.error('subscribeToMedia error', err);
                        });
                    }
                }
            });

            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM WAS REMOVED FROM THE CONVERSATION
            //=====================================================

            this.connectedConversation.on('streamAdded', (stream) => {
                stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
            }).on('streamRemoved', (stream) => {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);

            }).on('recordingAvailable', (recordingInfo) => {
                console.log('recordingInfo :', recordingInfo);
                console.log('recordingInfo.mediaURL :', recordingInfo.mediaURL);
                $("#"+ recordingInfo.mediaId).replaceWith('<li id=' + recordingInfo.mediaId + '>Your recording is available <a target="_blank" href=' + recordingInfo.mediaURL + '> here </a></li>');  //CLICKABLE RECORDING LINK//
            });

            //==============================
            // 5/ CREATE LOCAL STREAM
            //==============================

            var createStreamOptions: any = {};
            createStreamOptions.constraints = {
                audio: true,
                video: true
            };

            this.ua.createStream(createStreamOptions)
                .then((stream) =>  {

                    console.log('createStream :', stream);

                    // Save local stream
                    this.localStream = stream;
                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {}, true);

                    //==============================
                    // 6/ JOIN CONVERSATION
                    //==============================

                    this.connectedConversation.join()
                        .then((response) => {
                            //==============================
                            // 7/ PUBLISH OWN STREAM
                            //==============================
                            this.connectedConversation.publish(this.localStream, null);
                        }).catch((err) => {
                        console.error('Conversation join error', err);
                    });

                }).catch( (err) => {
                console.error('create stream error', err);
            });
        });

  }

  createConference() {
    console.log(this.conferenceName);

    document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are in conference: ' + this.conferenceName;
        // Join conference
        this.joinConference(this.conferenceName);

        document.getElementById('recordStart').style.display = 'inline-block';
  }

  startCompositeRecording() {
    console.log("startCompositeRecording");

        this.connectedConversation.startRecording()
            .then(function (recordingInfo) {
                console.info('startRecording', recordingInfo);
                console.info('startRecording mediaURL', recordingInfo.mediaURL);
                $("#recordingInfo").append('<li id=' + recordingInfo.mediaId + '>When ready, your recording will be available <a target="_blank" href=' + recordingInfo.mediaURL + '> here </a></li>');  //CLICKABLE RECORDING LINK//
                document.getElementById('recordStart').style.display = 'none';
                document.getElementById('recordStop').style.display = 'inline-block';
            })
            .catch(function (err) {
                console.error('startRecording', err);
            });
  }

  stopCompositeRecording() {

    console.log("stopCompositeRecording");

        this.connectedConversation.stopRecording()
            .then(function (recordingInfo) {
                    console.info('stopRecording', recordingInfo);
                    document.getElementById('recordStart').style.display = 'inline-block';
                    document.getElementById('recordStop').style.display = 'none';
                })
                .catch(function (err) {
                    console.error('stopRecording', err);
                });

  }

}
