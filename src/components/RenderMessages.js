import React from 'react';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import '../App.js';
import Banner from './Banner';
import MessageList from './MessageList';

const fetchMessages = gql`
  query ($last_received_id: Int, $last_received_ts: timestamptz){
    message (
      order_by: timestamp_asc
      where: {
        _and: {
          id: {
            _neq: $last_received_id
          },
          timestamp: {
            _gte: $last_received_ts
          }
        }

      }
    ) {
      id
      text
      username
      timestamp
    }
  }
`;

export default class RenderMessages extends React.Component {
  constructor() {
    super();
    this.state = {
      messages: [],
      newMessages: [],
      error: null,
    }
  }

  async componentWillMount() {
    // set mutation callback to update messages in state after mutation
    this.props.setMutationCallback(this.mutationCallback);
  }


  componentDidMount() {
    // add scroll listener on mount
    window.addEventListener("scroll", this.handleScroll);
  }


  componentDidUpdate() {
    if (this.state.newMessages.length === 0) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    // remove scroll listener on unmount
    window.removeEventListener("scroll", this.handleScroll);
  }

  // get appropriate query variables
  getLastReceivedVars = () => {
    const { messages, newMessages } = this.state;
    if (newMessages.length === 0) {
      if (messages.length !== 0) {
        return {
          last_received_id: messages[messages.length - 1].id,
          last_received_ts: messages[messages.length - 1].timestamp
        }
      } else {
        return {
          last_received_id: -1,
          last_received_ts: "2018-08-21T19:58:46.987552+00:00"
        }
      }
    } else {
      return {
        last_received_id: newMessages[newMessages.length - 1].id,
        last_received_ts: newMessages[newMessages.length - 1].timestamp
      }
    }
  }

  // add new (unread) messages to state
  addNewMessages = (messages) => {
    const newMessages = [...this.state.newMessages];
    messages.forEach((m) => {
      // do not add new messages from self
      if (m.username !== this.props.username) {
        newMessages.push(m);
      }
    });
    this.setState({
      ...this.state,
      newMessages
    })
  }

  // add old (read) messages to state
  addOldMessages = (messages) => {
    const oldMessages = [...this.state.messages, ...messages];
    this.setState({
      ...this.state,
      messages: oldMessages,
      newMessages: []
    })
  }

  // add message to state when text is entered
  mutationCallback = (message) => {
    const messages = [...this.state.messages, ...this.state.newMessages];
    messages.push(message);
    this.setState({
      ...this.state,
      messages,
      newMessages: []
    });
  }

  // custom refetch to be passed to parent for refetching on event occurance
  refetch = async () => {
    if (!this.state.loading) {
      const resp = await this.state.refetch(this.getLastReceivedVars());
      if (resp.data) {
        if (!this.isViewScrollable()) {
          this.addOldMessages(resp.data.message);
        } else {
          if (this.state.bottom) {
            this.addOldMessages(resp.data.message);
          } else {
            this.addNewMessages(resp.data.message);
          }
        }
      }
    }
  }

  // scroll to bottom
  scrollToBottom = () => {
    document.getElementById('lastMessage').scrollIntoView({ behavior: "instant" });
  }

  // scroll to the new message
  scrollToNewMessage = () => {
    document.getElementById('newMessage').scrollIntoView({ behavior: "instant" });
  }

  // scroll handler
  handleScroll = (e) => {
    const windowHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
    const body = document.getElementById("chatbox");
    const html = document.documentElement;
    const docHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    const windowBottom = windowHeight + window.pageYOffset;
    if (windowBottom >= docHeight) {
      this.setState({
        ...this.state,
        bottom: true
      })
    } else {
      if (this.state.bottom) {
        this.setState({
          ...this.state,
          bottom: false
        });
      }
    }
  }

  // check if the view is scrollable
  isViewScrollable = () => {
    const isInViewport = (elem) => {
      const bounding = elem.getBoundingClientRect();
      return (
        bounding.top >= 0 &&
        bounding.left >= 0 &&
        bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    };
    if (document.getElementById('lastMessage')) {
      return !isInViewport(document.getElementById('lastMessage'));
    }
    return false;
  }

  render() {
    const { messages, newMessages, bottom } = this.state;
    // set refetch in parent component for refetching data whenever an event occurs
    if (!this.props.refetch && this.state.refetch) {
      this.props.setRefetch(this.refetch);
    }
    return (
      <div id="chatbox">
        <Query
          query={gql`
            query($last_received_ts: timestamptz, $last_received_id: Int){
              message(order_by: {id: asc}, 
                where:{
                  _and:{
                    timestamp: {_gte: $last_received_ts},
                    id:{_neq: $last_received_id}
                  }
                }
              ) {
                id
                username
                text
                timestamp
              }
            }
          `}
          variables={this.getLastReceivedVars()}
        >
          {({ loading, error, data, refetch }) => {
            if (loading) {
              return 'Loading';
            }
            if (error) {
              return 'Error';
            }
            if (!this.state.refetch) {
              this.setState({
                ...this.state,
                refetch
              })
            }
            if (this.state.messages.length === 0) {
              if (data.message.length > 0) {
                this.addOldMessages(data.message)
              }
              return null;
            }
            return null;
          }}
        </Query>
        { /* show "unread messages" banner if not at bottom */}
        {
          (!bottom && newMessages.length > 0 && this.isViewScrollable()) ?
            <Banner
              scrollToNewMessage={this.scrollToNewMessage}
              numOfNewMessages={newMessages.length}
            /> : null
        }

        { /* Render old messages */}
        <MessageList
          messages={messages}
          isNew={false}
          username={this.props.username}
        />
        { /* Show old/new message separation */}
        <div
          id="newMessage"
          className="oldNewSeparator"
        >
          {
            newMessages.length !== 0 ?
              "New messages" :
              null
          }

        </div>

        { /* render new messages */}
        <MessageList
          messages={newMessages}
          isNew={true}
          username={this.props.username}
        />
        { /* Bottom div to scroll to */}
      </div>
    );
  }
}



