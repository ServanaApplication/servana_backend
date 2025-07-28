// backend/supabaseRealtime.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_SUPABASE_URL,
  process.env.REACT_SERVICE_ROLE_KEY
);

// In supabaseRealtime.js
function setupRealtimeListeners(io) {
  supabase
    .channel('chat-message-inserts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat'
      },
      async (payload) => {
        const newMessage = payload.new;
        
        // Fetch the full message details with sender info
        const { data: messageWithDetails, error } = await supabase
          .from('chat')
          .select(`
            *,
            system_user:sys_user_id(*, profile:prof_id(*)),
            client:client_id(*, profile:prof_id(*))
          `)
          .eq('chat_id', newMessage.chat_id)
          .single();

        if (error) {
          console.error('Error fetching message details:', error);
          return;
        }

        // Emit to the appropriate room
        io.to(newMessage.chat_group_id.toString()).emit("newMessage", {
          id: messageWithDetails.chat_id,
          sender: messageWithDetails.sys_user_id ? "user" : "system",
          content: messageWithDetails.chat_body,
          timestamp: messageWithDetails.chat_created_at,
          displayTime: new Date(messageWithDetails.chat_created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          profile: messageWithDetails.sys_user_id?.profile || 
                  messageWithDetails.client?.profile || 
                  null
        });
      }
    )
    .subscribe();
}
module.exports = setupRealtimeListeners;
