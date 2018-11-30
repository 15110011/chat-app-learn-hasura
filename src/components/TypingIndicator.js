import React from 'react';
import { Subscription } from 'react-apollo';
import gql from 'graphql-tag';
import '../App.css';

const getUserTyping = gql`
  subscription($userId: Int) {
    user_typing(where: {id: {_neq: $userId}}) {
      id
      username
      last_seen
      last_typed
    }
  }
`;


class TypingIndicator extends React.Component {
  render() {
    return (
      <div className="typingIndicator">
        <Subscription
          subscription={getUserTyping}
          variables={{ userId: this.props.userId }}
        >
          {
            ({ data, loading, error }) => {
              if (loading) { return ""; }
              if (error) { return ""; }
              if (data.user_typing.length === 0) {
                return "";
              } else {
                return `${data.user_typing[0].username} is typing ...`;
              }
            }
          }
        </Subscription>
      </div>
    )
  }
};

export default TypingIndicator;

