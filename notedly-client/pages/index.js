import { useQuery, gql } from "@apollo/client";

const GET_ALL_NOTES = gql`
  query getAllNotes {
    notes {
      id
      content
      author {
        username
      }
    }
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(GET_ALL_NOTES);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error:</p>;

  return (
    <div>
      <ul>
        {data.notes.map(({ content, author, id }) => {
          return (
            <li key={id}>
              <p>{content}</p>
              <small>by {author.username}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
